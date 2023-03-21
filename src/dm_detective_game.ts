// Importing required functions and types from xstate library
import { MachineConfig, send, Action, assign } from "xstate";

// A function that returns an xstate action to send a "SPEAK" event with a given text value
function say(text: string): Action<SDSContext, SDSEvent> {
  return send((_context: SDSContext) => ({ type: "SPEAK", value: text }));
}



// This function extracts the entity from the context and returns it
const setEntity = (context: SDSContext) => {

  
  let u = String(context.recResult[0].utterance);

  console.log(u)

  return u;
  
};

//This function sends a request Azure's CLU API with the provided text and returns the JSON response
const getIntents = (uttering: string) =>
  fetch(
    new Request("https://langauge-res-20345.cognitiveservices.azure.com/language/:analyze-conversations?api-version=2022-10-01-preview", {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": "1a397e0824494c3181333cc861fa156f",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        kind: "Conversation",
        analysisInput: {
          conversationItem: {
            id: "PARTICIPANT_ID_HERE",
            text: uttering,
            modality: "text",
            language: "en-US",
            participantId: "PARTICIPANT_ID_HERE",
          },
        },
        parameters: {
          projectName: "detective_game",
          verbose: true,
          deploymentName: "detective_model",
          stringIndexType: "TextElement_V8",
        },
      }),
    })
  )  .then((data) => data.json())
  .then((jsonData) => {
    console.log(jsonData);
    
    return jsonData;
  });



// This exports a state machine for a dialogue manager 
export const dmMachine: MachineConfig<SDSContext, any, SDSEvent> = {
    initial: "idle",
    states: {
      idle: {
        on: {
          CLICK: "init",
        },
      },
      init: {
        on: {
          TTS_READY: "intro",
          CLICK: "intro",
        },
      },
      intro: {
        initial: "intro",
        entry:[ assign({ fail_clue: (context) => context.fail_clue = 0, 
            success_clue: (context) => context.success_clue = 0,
            counter: (context) => context.counter =0
            
        },
            )],
        on: {
          RECOGNISED: [
            {
              target: "intro_info",
              actions: assign({
                username: (context) => setEntity(context, "username"),
              }),
            },

          ],
          TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 2,

            },
            {
              target: "init",
              cond: (context) => context.counter >= 2,
            },
          ],
          
        },
        states: {
          intro: {
            entry: say("Just so you know, the last so-called detective just quit his job and left, but just out of courtesy, what's your name?"),
            on: { ENDSPEECH: "ask" },
          },
          ask: {
            entry: send("LISTEN"),
          },
          nomatch: {
            entry: say(
              "Sorry, I didn't quite get that, please tell me once more."
            ),
            on: { ENDSPEECH: "ask" },
          },
          timer: {
            entry:[ say(
              "I'll ask again, who are you, stop wasting my time or leave!"
            ),
            assign({ counter: (context) => context.counter+=1 }), // increment counter
            ],

            on: { ENDSPEECH: "ask" },
          },
        },
      },
      intro_info: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Alright, so ${context.username} it is, let's get this over with then.`,
        })),
        on: { ENDSPEECH: "menu" },
      },
      menu: {
        initial: "menu_choice",
        on: {
          RECOGNISED: [
            {
              target: "info_choice",
              cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
              actions: assign({
                clue: (context) => setEntity(context),
              }),
            },
   
            {
              target: ".nomatch",
            },
          ],
          TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 2,

            },
            {
              target: "init",
              cond: (context) => context.counter >= 2,
            },
          ],
        },
        states: {
          menu_choice: {
            entry: send((context) => ({
              type: "SPEAK",
              value: `So... ${context?.username}, what would you like to know from me? And please, hurry it up.`,
            })),
            on: { ENDSPEECH: "ask" },
          },
          ask: {
            entry: send("LISTEN"),
          },
          nomatch: {
            entry: say(
              "Sorry, I don't know what it is. Tell me something I know."
            ),
            on: { ENDSPEECH: "ask" },
          },
          timer: {
            entry:[ say(
              "Stop wasting our time, are you going to question me or not?"
            ),
            assign({ counter: (context) => context.counter+=1 }), // increment counter
            ],

            on: { ENDSPEECH: "ask" },
          },
        },
      },
      menu_2: {
        initial: "menu_choice",
        on: {
          RECOGNISED: [
            {
              target: "info_choice",
              cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
              actions: assign({
                clue: (context) => setEntity(context),
              }),
            },
   
            {
              target: ".nomatch",
            },
          ],
          TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 2,

            },
            {
              target: "init",
              cond: (context) => context.counter >= 2,
            },
          ],
        },
        states: {
          menu_choice: {
            entry: say(`Look, I don't know what you want from me, please ask your questions and leave me alone!`),
            on: { ENDSPEECH: "ask" },
          },
          ask: {
            entry: send("LISTEN"),
          },
          nomatch: {
            entry: say(
              "Sorry, I don't know what it is. Tell me something I know."
            ),
            on: { ENDSPEECH: "ask" },
          },
          timer: {
            entry:[ say(
              "Stop wasting my time, are you going to question me or not?"
            ),
            assign({ counter: (context) => context.counter+=1 }), // increment counter
            ],

            on: { ENDSPEECH: "ask" },
          },
        },
      },
      secret_menu: {
        initial: "menu_choice",
        on: {
          RECOGNISED: [
            {
              target: "info_choice",
              cond: (context) => context.recResult[0].utterance.toLowerCase().replace(/\.$/g, "") != null,
              actions: assign({
                clue: (context) => setEntity(context),
              }),
            },
   
            {
              target: ".nomatch",
            },
          ],
          TIMEOUT: [
            {
              target: ".timer",
              cond: (context) => context.counter < 2,

            },
            {
              target: "init",
              cond: (context) => context.counter >= 2,
            },
          ],
        },
        states: {
          menu_choice: {
            entry: say(`Oh dear... so it has come to this then, ask away...`),
            on: { ENDSPEECH: "ask" },
          },
          ask: {
            entry: send("LISTEN"),
          },
          nomatch: {
            entry: say(
              "Sorry, I don't know what it is. Tell me something I know."
            ),
            on: { ENDSPEECH: "ask" },
          },
          timer: {
            entry:[ say(
              "Stop wasting our time, are you going to get to the bottom of this or not!?"
            ),
            assign({ counter: (context) => context.counter+=1 }), // increment counter
            ],

            on: { ENDSPEECH: "ask" },
          },
        },
      },
      fail_screen: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You are the worst detective I have ever seen, I am calling my lawyer and get out of here, goodbye and see ya never.
          You are a sorry excuse for a cop just so you know.`,
        })),
        on: { ENDSPEECH: "idle" },
  
  
        
      },
  
      normal_end: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `...So it seems all leads point to me. I guess this is then, then let's not waste any more time, 
          take this as my admission of guilt and let's end this. Yes I killed Sarah, I hated her because I was jealous, I got so intoxicated
          the night before just so I could finally kill her and get rid of her from my life. I faked the whole illness and timed everythin just right
          so I could get away with the perfect murder, or so I thought. Good job detective, you've caught me. `,
        })),
        on: { ENDSPEECH: "idle" },
  
  
        
      },
      secret_end: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Alright, no use prolonging this agony any further, I'll tell you everything, it wasn't me, I didn't do it,
          the arguments I kept having with Sarah were about her involvement in corporate espionage. Her other employer was a dangerous man,
          we had actually worked together for a while before I stopped. I kept trying to convince her to quit as well, telling her that this man
          was pretty influential and ruthless, but she wouldn't listen. I know who the hooded man was, he was her handler, I guess he deemed her
          role useless after they got what they wanted... and her murder ? It was just them tying their loose ends...`,
        })),
        on: { ENDSPEECH: "idle" },
  
  
        
      },
      repeat_text_error: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I don't get what you mean by this`,
        })),
        on: { ENDSPEECH: "info_choice" },
  
  
        
      },
      info_choice: {
        invoke: {
          src: (context, event) => getIntents(context.clue),
          onDone: [
            {
              target: 'repeat_text_error',
              cond: (context, event) =>  event.data.result.prediction.entities.length === 0,
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,
              }),
            },

            {
              target: 'repeat_clue_texts',
              cond: (context, event) => (context?.angry_text === "Success" || context?.angry_text === "Fail") && event.data.result.prediction.entities?.[0]?.category === "angry_text_messages",
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,
              }),
            },
            {
              target: 'repeat_clue_assault',
              cond: (context, event) => (context?.assault === "Success" || context?.assault === "Fail") && event.data.result.prediction.entities?.[0]?.category === "assault_in_the_past",
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,
              }),
            },
            {
              target: 'repeat_clue_CCTV',
              cond: (context, event) => (context?.cctv === "Success" || context?.cctv === "Fail") && event.data.result.prediction.entities?.[0]?.category === "CCTV",
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,

              }),
          },
          {
            target: 'repeat_clue_relationship',
            cond: (context, event) => (context?.relationship === "Success" || context?.relationship === "Fail") && event.data.result.prediction.entities?.[0]?.category === "contentious_relationship",
            actions: assign({
              fail_clue: (_context, event) => _context.fail_clue+=1,

            }),
        },
        {
          target: 'repeat_clue_cord',
          cond: (context, event) => (context?.cord === "Success" || context?.cord === "Fail") && event.data.result.prediction.entities?.[0]?.category === "cord_crime_scene",
          actions: assign({
            fail_clue: (_context, event) => _context.fail_clue+=1,

          }),
      },
      {
        target: 'repeat_clue_ill',
        cond: (context, event) => (context?.ill === "Success" || context?.ill === "Fail") && event.data.result.prediction.entities?.[0]?.category === "feeling_ill",
        actions: assign({
          fail_clue: (_context, event) => _context.fail_clue+=1,

        }),
    },
    {
      target: 'repeat_clue_witness',
      cond: (context, event) => (context?.witness === "Success" || context?.witness === "Fail") && event.data.result.prediction.entities?.[0]?.category === "no_witnesses",
      actions: assign({
        fail_clue: (_context, event) => _context.fail_clue+=1,

      }),
  },
    {
      target: 'repeat_clue_suspicious',
      cond: (context, event) => (context?.suspicious === "Success" || context?.suspicious === "Fail") && event.data.result.prediction.entities?.[0]?.category === "suspicious_looking_individual",
      actions: assign({
        fail_clue: (_context, event) => _context.fail_clue+=1,

      }),
  },
  {
    target: 'repeat_clue_bar',
    cond: (context, event) => (context?.bar === "Success" || context?.bar === "Fail") && event.data.result.prediction.entities?.[0]?.category === "spotted_at_bar" ,
    actions: assign({
      fail_clue: (_context, event) => _context.fail_clue+=1,

    }),
},


            {
              target: 'success_angry_text_messages',
              cond: (context, event) => event.data.result.prediction.topIntent === "accuse" && event.data.result.prediction.entities?.[0]?.category === "angry_text_messages",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                angry_text: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_assault',
              cond: (context, event) => {
                return event.data.result.prediction.topIntent === "placate" && event.data.result.prediction.entities?.[0]?.category === "assault_in_the_past"
              },
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                assault: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_CCTV',
              cond: (context, event) => event.data.result.prediction.topIntent === "bluff" && event.data.result.prediction.entities?.[0]?.category === "CCTV",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                cctv: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_relationship',
              cond: (context, event) => event.data.result.prediction.topIntent === "accuse" && event.data.result.prediction.entities?.[0]?.category === "contentious_relationship",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                relationship: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_cord',
              cond: (context, event) => event.data.result.prediction.topIntent === "accuse" && event.data.result.prediction.entities?.[0]?.category === "cord_crime_scene",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                cord: (context, event) => "Success"
              }),
            },
            {
              target: 'success_ill',
              cond: (context, event) => event.data.result.prediction.topIntent === "accuse" && event.data.result.prediction.entities?.[0]?.category === "feeling_ill",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                ill: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_witness',
              cond: (context, event) => event.data.result.prediction.topIntent === "placate" && event.data.result.prediction.entities?.[0]?.category === "no_witnesses",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                witness: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_bar',
              cond: (context, event) => event.data.result.prediction.topIntent === "bluff" && event.data.result.prediction.entities?.[0]?.category === "spotted_at_bar",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                bar: (_context, event) => "Success"
              }),
            },
            {
              target: 'success_suspicious',
              cond: (context, event) => event.data.result.prediction.topIntent === "bluff" && event.data.result.prediction.entities?.[0]?.category === "suspicious_looking_individual",
              actions: assign({
                success_clue: (_context, event) => _context.success_clue+=1,
                suspicious: (_context, event) => "Success"
              }),
            },
            {
              target: 'fail_angry_text_messages',
              cond: (context, event) => {
                console.log("topIntent:", event.data.result.prediction.topIntent);
                return event.data.result.prediction.topIntent != "accuse" && event.data.result.prediction.entities?.[0]?.category === "angry_text_messages"
              },
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,
                angry_text: (_context, event) => "Fail"
              }),
            },
            {
              target: 'fail_assault',
              cond: (context, event) => {
                console.log("topIntent:", event.data.result.prediction.topIntent);
                return event.data.result.prediction.topIntent != "placate" && event.data.result.prediction.entities?.[0]?.category === "assault_in_the_past"
              },
              actions: assign({
                fail_clue: (_context, event) => _context.fail_clue+=1,
                assault: (_context, event) => "Fail"
              }),
                       },          

            {
                target: 'fail_CCTV',
                cond: (context, event) => event.data.result.prediction.topIntent != "bluff" && event.data.result.prediction.entities?.[0]?.category === "CCTV", 
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  cctv: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_relationship',
                cond: (context, event) => event.data.result.prediction.topIntent != "accuse" && event.data.result.prediction.entities?.[0]?.category ==="contentious_relationship",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  relationship: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_cord',
                cond: (context, event) => event.data.result.prediction.topIntent != "accuse" && event.data.result.prediction.entities?.[0]?.category === "cord_crime_scene",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  cord: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_ill',
                cond: (context, event) => event.data.result.prediction.topIntent != "placate" && event.data.result.prediction.entities?.[0]?.category === "feeling_ill",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  ill: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_witness',
                cond: (context, event) => event.data.result.prediction.topIntent != "placate" && event.data.result.prediction.entities?.[0]?.category === "no_witnesses",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  witness: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_bar',
                cond: (context, event) => event.data.result.prediction.topIntent != "bluff" && event.data.result.prediction.entities?.[0]?.category === "spotted_at_bar",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  bar: (_context, event) => "Fail"
                }),
            },


            {
                target: 'fail_suspicious',
                cond: (context, event) => event.data.result.prediction.topIntent != "bluff" && event.data.result.prediction.entities?.[0]?.category === "suspicious_looking_individual",
                actions: assign({
                  fail_clue: (_context, event) => _context.fail_clue+=1,
                  suspicious: (_context, event) => "Fail"
                }),
            },

          ],
          onError: {
            target: 'failure_choice',
            actions: (context, event) => console.log(event.data)
          }
        }
      },
      failure_choice: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH:  "menu" },
      },
      repeat_clue_texts: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You already asked that`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_angry_text_messages: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I don't know about any messages. I understand why somebody would send her such messages though. 
          She wasn't exactly the most likeable person, but she didn't deserve to be killed. 
          Who knows in what affairs she ended up entagled, she had this tendency to snoop around other people's business, 
          I did tell her it would end up bad for her one day.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
            },

            {
              target: "menu",
              cond: (context) => context.success_clue + context.fail_clue <= 3,
            },
            {
              target: "menu_2",
              cond: (context) => context.success_clue + context.fail_clue < 9,
            },

          ],
        },
      },
      
      fail_angry_text_messages: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `No, I did not send her those messages, and even if I did, there's quite a large jump to make from
          just sending some aggresive messages to murdering somebody.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue ) >6 && context.fail_clue != 0 ,
            },


            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },
      repeat_clue_assault: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_assault: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Yeah..., they happened a while ago, the first one happened when I was young and one of my friends 
          kept being harassed so I stepped in to stop it, ...too bad it turned violent and the police got involved. 
          The second time... I'm ashamed to admit, it happened recently after my divorce, I was out drinking to forget 
          and then I got into an argument with this guy at the bar...and it turned ugly, but again, nobody suffered any 
          serious harm.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },
      fail_assault: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `What does that have to do with anything. They happened in the past and had been solved according 
          to existing laws. I wasn't the instigator and they didn't end up in anyone's death. Why don't you stop 
          looking through my past in search of far-fetched connexions and let me go already!`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },
            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      }, repeat_clue_CCTV: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_CCTV: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I understand why that might seem suspicious, but I assure you that I had nothing to do with the murder! 
          As for my car being spotted in the area, I do a lot of driving for work and my schedule can be unpredictable. 
          It's possible that my car was in the area, but I can't recall any specific details about that day.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_CCTV: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Look I know I look like a prime suspect due to that, but I was just feeling sick, so I left work early. 
          I was in a rush to get home, maybe I should be the suspect for a speeding ticket but that's all there is to that 
          I swear!`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_relationship: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_relationship: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `That's a ridiculous accusation. Yes, Sarah and I had our disagreements, but that doesn't mean I would ever resort 
          to murder. I may have disliked her, but I'm not a monster! I had nothing to do with her death, and I find it insulting that 
          you would even suggest such a thing.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_relationship: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I won't deny it, I didn't like her one bit, something about her just irked me the wrong way. 
          What with her success and popularity 'round the office. Everyone just loved Sarah, she could do no wrong! 
          Not our little Sarah. .... Anyways I don't see how that would give me the motive`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_cord: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_cord: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Look, I'll tell you something, I don't have it in me to just strangle somebody in cold blood. 
          I just can't, even if I had some less than civil encounters in the past, it was always in the heat of the moment 
          and they didn't last long either. So no, I couldn't have strangled her.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },
            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_cord: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I have no idea about any murder weapon. I'm a data analyst, not a criminal. I understand that you need to 
          investigate all possible leads, but accusing me of something that I didn't do is not going to get us anywhere. 
          You need to look for evidence that points to the actual perpetrator, not just make baseless accusations.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_ill: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_ill: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Ok ok, hear me out, I was feeling a little bad that day, but not that much. Just that, I hate my job. 
          You know how it is, you go through the daily grind everyday, you just stop caring after a while and try to find ways 
          of getting out of it as often as possible. Just my luck that this whole incident happened right when I wanted a shorter day at work... `,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },
            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_ill: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `That's a baseless accusation. I have never left work early to harm anyone, let alone murder someone. 
          As a data analyst, my work is important to me and I take my responsibilities seriously.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_witness: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_witness: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I mean... the lack of witnesses is purely a badly timed coincidence, at the time I left and when I suppose 
          the murder happened, just about everybody in the business park is either working or having lunch at one of the nearby 
          restaurants. Everyone around the office knows that the place can look pretty deserted at that time.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },
            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_witness: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `I understand your concern, but unfortunately, I just don't have any information that could be useful in this matter. 
          As far as I know, I wasn't around the scene at the time the murder took place. Moreover, I'm not aware of anyone who could 
          have witnessed the crime.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_bar: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_bar: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Yeah I was drinking the night before, you got me, it's my way of coping with the stress of my job. 
          It's not that unusual for me, maybe not healthy, but it certainly shouldn't be suspicious you know ? 
          And truth to be told, I drank so much that I did feel a bit sick the next day, can't really remember much of what 
          happened at work either.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_bar: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `That's a ridiculous accusation. I didn't know it was ilegal to drink. What do I in my spare time is my business. 
          Just because I was drinking doesn't mean I would commit murder. I have no memory of being anywhere near the victim that 
          night. Are you trying to twist the facts to make me look guilty?`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],
        },
      },      repeat_clue_suspicious: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `You've already asked me that, I've told you all there is to know, end of story!`,
        })),
        on: { ENDSPEECH: [            
          {
            target: "normal_end",
            cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0,
          },
      {
          target: "fail_screen",
          cond: (context) => context.fail_clue >= 3,
        },
        {
          target: "menu",
          cond: (context) => context.success_clue + context.fail_clue <= 3,
        },
        {
          target: "menu_2",
          cond: (context) => context.success_clue + context.fail_clue < 9,
        },
      ]  },
      },
      success_suspicious: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `Yeah, I saw somebody when I was leaving, they seemed *pretty* shady if you ask me, but I wouldn't go as far as 
          saying that they killed Sarah.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "secret_end",
              cond: (context) => context.success_clue === 9 && context.fail_clue === 0,
            },
            {
              target: "secret_menu",
              cond: (context) => context.success_clue >= 6 && context.success_clue < 9 && context.fail_clue === 0,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue !== 0,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },
          ],        },
      },
      fail_suspicious: {
        entry: send((context) => ({
          type: "SPEAK",
          value: `No, I don't know who that is, didn't see anybody like that in the area, this seems like a waste of time if 
          you ask me.`,
        })),
        on: {
          ENDSPEECH: [
            {
              target: "fail_screen",
              cond: (context) => context.fail_clue >= 3,
            },
            {
              target: "normal_end",
              cond: (context) => (context.success_clue + context.fail_clue) > 6 && context.fail_clue != 0 ,
            },

            {
              target: "menu",
              cond: (context) => (context.success_clue + context.fail_clue )<= 3,
            },
            {
              target: "menu_2",
              cond: (context) => (context.success_clue + context.fail_clue ) <9,
            },


          ],
        },
      },
      
    }

}
