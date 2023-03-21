import "./styles.css";
import * as React from "react";
import * as ReactDOM from "react-dom";
import ScrollableTextBox from './scrollable_textbox';
import { createMachine, assign, actions, State, interpret, Machine } from "xstate";
import { useMachine } from "@xstate/react";
import { inspect } from "@xstate/inspect";
import { dmMachine } from "./dm_detective_game";

import createSpeechRecognitionPonyfill from "web-speech-cognitive-services/lib/SpeechServices/SpeechToText";
import createSpeechSynthesisPonyfill from "web-speech-cognitive-services/lib/SpeechServices/TextToSpeech";

const { send, cancel } = actions;

const TOKEN_ENDPOINT =
  "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken";
const REGION = "northeurope";

if (process.env.NODE_ENV === "development") {
  inspect({
    iframe: false,
  });
}
const myArray: string[] = [];
let rope: string = "null"
let cctv: string = "null"


let clue_states: {[key: string]: any} = {};

const defaultPassivity = 10;

const machine = createMachine(
  {
    predictableActionArguments: true,
    schema: {
      context: {} as SDSContext,
      events: {} as SDSEvent,
    },
    id: "root",
    type: "parallel",
    states: {
      dm: {
        ...dmMachine,
      },

      asrtts: {
        initial: "init",
        states: {
          init: {
            on: {
              CLICK: {
                target: "getToken",
                actions: [
                  "createAudioContext",
                  (context) =>
                    navigator.mediaDevices
                      .getUserMedia({ audio: true })
                      .then(function (stream) {
                        context.audioCtx.createMediaStreamSource(stream);
                      }),
                ],
              },
            },
          },
          getToken: {
            invoke: {
              id: "getAuthorizationToken",
              src: (context) =>
                getAuthorizationToken(context.parameters.azureKey!),
              onDone: {
                actions: ["assignToken", "ponyfillASR"],
                target: "ponyfillTTS",
              },
              onError: {
                target: "fail",
              },
            },
          },
          ponyfillTTS: {
            invoke: {
              id: "ponyTTS",
              src: (context, _event) => (callback, _onReceive) => {
                const ponyfill = createSpeechSynthesisPonyfill({
                  audioContext: context.audioCtx,
                  credentials: {
                    region: REGION,
                    authorizationToken: context.azureAuthorizationToken,
                  },
                });
                const { speechSynthesis, SpeechSynthesisUtterance } = ponyfill;
                context.tts = speechSynthesis;
                context.ttsUtterance = SpeechSynthesisUtterance;
                context.tts.addEventListener("voiceschanged", () => {
                  context.tts.cancel();
                  const voices = context.tts.getVoices();
                  //"Microsoft Server Speech Text to Speech Voice (en-AU, WilliamNeural)" nr 77
                  const voiceRe = RegExp(context.parameters.ttsVoice, "u");
                  //console.log(voices)
                  //const voice = voices.find((v: any) => voiceRe.test(v.name))!;
                  const voice = context.tts.getVoices()[77]
                  if (voice) {
                    context.voice = voice;
                    callback("TTS_READY");
                  } else {
                    console.error(
                      `TTS_ERROR: Could not get voice for regexp ${voiceRe}`
                    );
                    callback("TTS_ERROR");
                  }
                });
              },
            },
            on: {
              TTS_READY: "idle",
              TTS_ERROR: "fail",
            },
          },
          idle: {
            on: {
              LISTEN: "recognising",
              SPEAK: {
                target: "speaking",
                actions: "assignAgenda",
              },
            },
          },
          recognising: {
            initial: "noinput",
            exit: "recStop",
            on: {
              ASRRESULT: {
                actions: "assignRecResult",
                target: ".match",
              },
              RECOGNISED: { target: "idle", actions: "recLogResult" },
              SELECT: "idle",
              CLICK: ".pause",
            },
            states: {
              noinput: {
                entry: [
                  "recStart",
                  send(
                    { type: "TIMEOUT" },
                    {
                      delay: (_context: SDSContext) => 1000 * defaultPassivity,
                      id: "timeout",
                    }
                  ),
                ],
                on: {
                  TIMEOUT: "#root.asrtts.idle",
                  STARTSPEECH: "inprogress",
                },
                exit: cancel("timeout"),
              },
              inprogress: {},
              match: {
                invoke: {
                  id: "getIntents",
                  src: (context) => getIntents(context),
                  onDone: {
                    actions: ["assignIntents", "sendRecognised"],
                  },
                  onError: {
                    actions: "sendRecognised",
                  },
                },
              },
              pause: {
                entry: "recStop",
                on: { CLICK: "noinput" },
              },
            },
          },
          speaking: {
            entry: "ttsStart",
            on: {
              ENDSPEECH: "idle",
              SELECT: "idle",
              CLICK: { target: "idle", actions: "sendEndspeech" },
            },
            exit: "ttsStop",
          },
          fail: {},
        },
      },
    },
  },
  {
    guards: {
      prob: (_context, _event, { cond }: any) => {
        let rnd = Math.random();
        return rnd >= cond.threshold ? true : false;
      },
    },
    actions: {
      createAudioContext: (context: SDSContext) => {
        context.audioCtx = new ((window as any).AudioContext ||
          (window as any).webkitAudioContext)();
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then(function (stream) {
            context.audioCtx.createMediaStreamSource(stream);
          });
      },
      assignToken: assign({
        azureAuthorizationToken: (_context, event: any) => event.data,
      }),
      assignAgenda: assign({
        ttsAgenda: (_context, event: any) => event.value,
      }),
      assignRecResult: assign({
        recResult: (_context, event: any) => event.value,
      }),
      sendEndspeech: send("ENDSPEECH"),
      assignIntents: assign({
        nluResult: (_context, event: any) => {
          return event.data.result;
        },
      }),
      sendRecognised: send("RECOGNISED"),
      recLogResult: (context: SDSContext) => {
        console.log("U>", context.recResult[0]["utterance"], {
          confidence: context.recResult[0]["confidence"],
        });
      },
      changeColour: (context) => {
        let color = context.recResult[0].utterance
          .toLowerCase()
          .replace(/[\W_]+/g, "");
        console.log(`(repaiting to ${color})`);
        document.body.style.backgroundColor = color;
      },
    },
  }
);

interface Props extends React.HTMLAttributes<HTMLElement> {
  state: State<SDSContext, any, any, any, any>;
  alternative: any;
}
const ReactiveButton = (props: Props): JSX.Element => {
  var promptText = "\u00A0";
  var circleClass = "circle";
  switch (true) {
    case props.state.matches({ asrtts: "fail" }) ||
      props.state.matches({ dm: "fail" }):
      break;
    case props.state.matches({ asrtts: { recognising: "pause" } }):
      promptText = "Click to continue";
      break;
    case props.state.matches({ asrtts: "recognising" }):
      circleClass = "circle-recognising";
      promptText = "Listening...";
      break;
    case props.state.matches({ asrtts: "speaking" }):
      circleClass = "circle-speaking";
      promptText = "Speaking...";
      break;
    case props.state.matches({ dm: "idle" }):
      promptText = "Click to start!";
      circleClass = "circle-click";
      break;
    case props.state.matches({ dm: "init" }):
      promptText = "Click to start!";
      circleClass = "circle-click";
      break;
    default:
      promptText = "\u00A0";
  }
  return (
    <div className="control">
      <div className="status">
        <button
          type="button"
          className={circleClass}
          style={{}}
          {...props}
        ></button>
        <div className="status-text">{promptText}</div>
      </div>
    </div>
  );
};

function App({ domElement }: any) {
  const externalContext = {
    parameters: {
      ttsVoice: domElement.getAttribute("data-tts-voice") || "en-US",
      ttsLexicon: domElement.getAttribute("data-tts-lexicon"),
      asrLanguage: domElement.getAttribute("data-asr-language") || "en-US",
      azureKey: domElement.getAttribute("data-azure-key"),
      azureNLUKey: domElement.getAttribute("data-azure-nlu-key"),
      azureNLUUrl: domElement.getAttribute("data-azure-nlu-url"),
      azureNLUprojectName: domElement.getAttribute(
        "data-azure-nlu-project-name"
      ),
      azureNLUdeploymentName: domElement.getAttribute(
        "data-azure-nlu-deployment-name"
      ),
    },
  };
  const [messages, setMessages] = React.useState([] as any[]);
  const dmService = interpret(Machine(dmMachine)).onTransition((state) => {
    if (state.context.message) {
      setMessages((messages) => [...messages, state.context.message]);
    }
  });

  const [state, send] = useMachine(machine, {
    context: { ...machine.context, ...externalContext },
    devTools: process.env.NODE_ENV === "development" ? true : false,
    actions: {
      recStart: (context) => {
        context.asr.start();
        /* console.log('Ready to receive a voice input.'); */
      },
      recStop: (context) => {
        context.asr.abort();
        /* console.log('Recognition stopped.'); */
      },
      ttsStart: (context) => {
        let content = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US"><voice name="${context.voice.name}">`;
        content =
          content +
          (context.parameters.ttsLexicon
            ? `<lexicon uri="${context.parameters.ttsLexicon}"/>`
            : "");
        content = content + `${context.ttsAgenda}</voice></speak>`;
        const utterance = new context.ttsUtterance(content);
        console.log("S>", context.ttsAgenda);
        clue_states.rope = state.context.cord;
        clue_states.cctv = state.context.cctv;
        clue_states.rel=state.context.relationship
        clue_states.assault = state.context.assault
        clue_states.texts = state.context.angry_text
        clue_states.illness = state.context.ill
        clue_states.drunk = state.context.bar
        clue_states.witness = state.context.witness
        clue_states.suspicious = state.context.suspicious


        myArray.push(context.ttsAgenda)
        utterance.voice = context.voice;
        utterance.onend = () => send("ENDSPEECH");
        context.tts.speak(utterance);
      },
      ttsStop: (context) => {
        /* console.log('TTS STOP...'); */
        context.tts.cancel();
      },
      ponyfillASR: (context) => {
        const { SpeechRecognition } = createSpeechRecognitionPonyfill({
          audioContext: context.audioCtx,
          credentials: {
            region: REGION,
            authorizationToken: context.azureAuthorizationToken,
          },
        });
        context.asr = new SpeechRecognition();
        context.asr.lang = context.parameters.asrLanguage || "en-US";
        context.asr.continuous = true;
        context.asr.interimResults = true;
        context.asr.onresult = function (event: any) {
          var result = event.results[0];
          if (result.isFinal) {
            send({
              type: "ASRRESULT",
              value: [
                {
                  utterance: result[0].transcript,
                  confidence: result[0].confidence,
                },
              ],
            });
          } else {
            send({ type: "STARTSPEECH" });
          }
        };
      },
    },
  });
  const clueArray = [
    "rope found at crime scene",
    "CCTV camera footage",
    "contentious relationship with victim",
    "left early due to claiming illness",
    "history of past violence",
    "victim received threatening text messages on the night before the murder",
    "no witness at the crime scene",
    "suspect spotted at bar the night before",
    "suspicious individual spotted in the area after the murder",
  ];
  switch (true) {
    default:
      return (
        <div className="App">
          <ReactiveButton
            state={state}
            key={machine.id}
            alternative={{}}
            onClick={() => send("CLICK")}
          />
          <MyComponent

          />
          <MyComponent_3  props = {myArray}/>

          
          <MyComponent_4  items= {clueArray} variable1={ clue_states}  />

        </div>
      );

  }
}
function MyComponent_4({ items, variable1 }) {
  return (
    <div className="my-component">
      <ul
        style={{
          height: "200px",
          width: "600px",
          resize: "none",
          position: "absolute",
          right: "50px",
          top: "140px",
        }}
      >
        {items.map((item) => (
          <li key={item}>
          {variable1.assault === "Success" && item.includes("violence") ? (
            <span style={{ color: "green" }}>{item}</span>
          ):variable1.assault === "Fail" && item.includes("violence") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) : variable1.rel === "Success" && item.includes("relationship") ? (
            <span style={{ color: "green" }}>{item}</span>
          )
           :
            variable1.rel === "Fail" && item.includes("relationship") ? (
              <span style={{ color: "red" }}>{item}</span>
            ):variable1.illness === "Fail" && item.includes("illness") ? (
              <span style={{ color: "red" }}>{item}</span>
            ) : variable1.illness === "Success" && item.includes("illness") ? (
              <span style={{ color: "green" }}>{item}</span>
            )
             :
          variable1.texts === "Success" && item.includes("messages") ? (
            <span style={{ color: "green" }}>{item}</span>
          ):variable1.texts === "Fail" && item.includes("messages") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) : variable1.witness === "Success" && item.includes("witness") ? (
            <span style={{ color: "green" }}>{item}</span>
          )
           :
          variable1.witness === "Success" && item.includes("witness") ? (
            <span style={{ color: "green" }}>{item}</span>
          ):variable1.drunk === "Fail" && item.includes("bar") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) : variable1.drunk === "Success" && item.includes("bar") ? (
            <span style={{ color: "green" }}>{item}</span>
          )
           :
          variable1.suspicious === "Success" && item.includes("suspicious") ? (
            <span style={{ color: "green" }}>{item}</span>
          ):variable1.suspicious === "Fail" && item.includes("suspicious") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) :
          variable1.rope === "Success" && item.includes("rope") ? (
            <span style={{ color: "green" }}>{item}</span>
          ):variable1.rope === "Fail" && item.includes("rope") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) 
           : variable1.cctv === "Fail" && item.includes("CCTV camera footage") ? (
            <span style={{ color: "red" }}>{item}</span>
          ) : variable1.cctv === "Success" && item.includes("CCTV camera footage") ? (
            <span style={{ color: "green" }}>{item}</span>
          ) : (
            item
          )}
        </li>
        ))}
      </ul>
    </div>
  );
}





function MyComponent_3({ props }) {

  const [textArray, setTextArray] = React.useState([]);




  React.useEffect(() => {
    setTextArray(props.updatedArray);
  }, [props.updatedArray]);

 
  return (
    <div>
      <textarea
        value={props.join("\n")}
        readOnly={true}
        style={{ overflowY: "scroll", height: "200px", width: "600px", resize: "none",
         position: 'absolute', right: "auto", bottom: "140px" }}

      />
    </div>
  );
}



const MyComponent = () => {
  const text = `Case File: Murder of a Coworker

  Overview:
  On June 28, 2022, the body of a young woman named Sarah Miller was discovered in the parking lot of a local business park. Sarah was an employee at one of the companies located in the park and had been working late the previous night. Upon arriving at work the next day, another employee
  noticed her car still parked in the lot and found her body lying nearby. Sarah had been strangled with a rope, which was found nearby, and there were signs of a struggle. The cause of death was determined to be strangulation. The primary suspect in the case is William Dundee, another employee at the company, who was seen leaving the scene of the crime on CCTV footage.
  William was seen leaving the business park around the same time that Sarah was last seen alive, and his car was caught on CCTV driving away from the scene of the crime. Additionally, William had a history of violence, having been arrested for assault in the past.
  
  Clues:
  
      Rope found at crime scene: The murder weapon was a rope, which was found near the victim's body. The rope appeared to have been tied in a knot, consistent with a strangulation.
  
      Suspect's car was spotted leaving at the time of the murder by the CCTV camera footage: The CCTV footage shows William's car leaving the company parking lot at the time of the murder.
  
      Suspect had a contentious relationship with victim: William and Sarah had a history of disagreements and arguments at work. Some coworkers have reported that their relationship had been particularly strained in the weeks leading up to the murder.
  
      Suspect left early due to claiming illness: On the day of the murder, William left work early, citing illness as the reason. This gave them ample time to commit the murder and leave the scene unnoticed.
  
      Suspect has a history of past violence: Police records show that William has a history of violence, including assault and battery charges.
  
      Victim received threatening text messages on the night before the murder: The night before the murder, Sarah received several threatening text messages from an unknown number. The messages were not traced back to William, but they suggest that someone may have had a motive to harm the victim.
  
      No witness at the crime scene: There were no witnesses present at the time of the murder, and no one saw William entering or leaving the victim's office.
  
      Suspect spotted at bar the night before the murder: Several witnesses report seeing Sarah at a local bar the night before the murder. They appeared to be agitated and had several drinks.
  
      Suspicious individual spotted in the area after the murder: A witness reported seeing a suspicious individual in the area around the time of the murder. The individual was wearing a hooded sweatshirt and appeared to be trying to avoid detection.
  
  Conclusion:
  Based on the evidence gathered, it appears likely that William is responsible for the murder of Sarah. Their history of violence, contentious relationship with the victim, and presence at the scene of the crime make them a strong suspect. However, the threatening text messages and the suspicious individual seen in the area suggest that there may be more to the case than initially meets the eye. The police investigation is ongoing, and more information may come to light as the case unfolds.
  
  `;

  return (
    <div>
      <ScrollableTextBox text={text} />
    </div>
  );
};

export default MyComponent;


const getAuthorizationToken = (azureKey: string) =>
  fetch(
    new Request(TOKEN_ENDPOINT, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": azureKey,
      },
    })
  ).then((data) => data.text());

const getIntents = (context: SDSContext) =>
  fetch(
    new Request(context.parameters.azureNLUUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": context.parameters.azureNLUKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "Conversation",
        analysisInput: {
          conversationItem: {
            id: "PARTICIPANT_ID_HERE",
            text: context.recResult[0].utterance,
            modality: "text",
            language: context.parameters.asrLanguage,
            participantId: "PARTICIPANT_ID_HERE",
          },
        },
        parameters: {
          projectName: context.parameters.azureNLUprojectName,
          verbose: true,
          deploymentName: context.parameters.azureNLUdeploymentName,
          stringIndexType: "TextElement_V8",
        },
      }),
    })
  ).then((data) => data.json());

const rootElement = document.getElementById("speechstate");
ReactDOM.render(<App domElement={rootElement} />, rootElement);
