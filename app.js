require("dotenv").config({ path: "./.env" });
const { App, ExpressReceiver } = require("@slack/bolt");

const { supabase } = require("./utils/supabase");

// const createHome = require("./appHome");
// const openModal = require("./appHome");

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: new ExpressReceiver({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    customPropertiesExtractor: (req) => {
      return {
        headers: req.headers,
        foo: "barrr",
      };
    },
  }),
});

app.use(async ({ logger, context, next }) => {
  logger.info(context);

  // リトライされたイベントであればスキップすべきかどうか判断する
  if (context.retryNum) {
    return;
  }
  // if (context.retryNum && shouldSkip(context)) {
  //   return;
  // }

  await next();
});

// "hello" を含むメッセージをリッスンします
app.message("hello", async ({ message, say }) => {
  // イベントがトリガーされたチャンネルに say() でメッセージを送信します

  //   // ここで時間のかかる処理をの実行
  //   // sending email
  const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await _sleep(5000);

  await say(`Hey there <@${message.user}>!`);
});

app.event("app_home_opened", async ({ event, context, payload }) => {
  // Display App Home

  const homeView = await createHome(event.user);

  try {
    const result = await app.client.views.publish({
      token: context.botToken,
      user_id: event.user,
      view: homeView,
    });
  } catch (e) {
    app.error(e);
  }
});

// Receive button actions from App Home UI "課題を作成する"
app.action("add_note", async ({ body, context, ack }) => {
  ack();

  if (body.user.id === process.env.SLACK_USER_ID) {
    const view = openModal();

    try {
      const result = await app.client.views.open({
        token: context.botToken,
        trigger_id: body.trigger_id,
        view: view,
      });
    } catch (e) {
      console.log(e);
      app.error(e);
    }
  } else {
    console.log("you are not allowed.");
  }
});

app.action("user_select", async ({ ack, body, say }) => {
  await ack();
});

// Receive view_submissions - add_noteで開いたmodalの処理
app.view("modal_view", async ({ ack, body, context, view }) => {
  ack();

  // ここを年月日表示にする
  const ts = new Date();

  const data = {
    timestamp: ts.toLocaleString(),
    note: view.state.values.note01.content.value,
    url: view.state.values.note02.img_url.value,
    category: view.state.values.note03.category.selected_option.value,
    chanelId: view.state.values.section678.user_select.selected_conversation,
  };

  const homeView = await createHome(body.user.id, data);

  const blocks = kadaiView(data.note, data.url);

  // url setting change
  try {
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: data.chanelId,
      text: `:wave: ${data.note}`,
      blocks: blocks,
    });
  } catch (e) {
    app.error(e);
  }

  try {
    const result = await app.client.apiCall("views.publish", {
      token: context.botToken,
      user_id: body.user.id,
      view: homeView,
    });
  } catch (e) {
    console.log(e);
    app.error(e);
  }
});

// // blocksの中身をappHome.js pageで作成する
// app.action("kadai-submit", async ({ ack, body, action, respond, context }) => {
//   await ack();
//   const blocks = kadaiSubmit(body.message.text);

//   await respond({
//     text: "この内容で提出しますか？",
//     blocks: blocks,
//     replace_original: false,
//   });
// });

app.view("kadai_post", async ({ ack, body, context, view }) => {
  await ack();

  // console.log("--->hello", body.view.title.text);
  // console.log("--->goodbye", view.state.values);

  const data = {
    note: body.view.title.text,
    question: view.state.values["kadai-question"].my_action.value,
    level: view.state.values["kadai-level"].category.selected_option.text.text,
    ideaTime:
      view.state.values["kadai-idea"].category.selected_option.text.text,
  };
  const channelId = "C014B3R037T";

  //   // ここで時間のかかる処理をの実行
  //   // sending email
  const _sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await _sleep(5000);

  try {
    const result = await app.client.chat.postMessage({
      token: process.env.SLACK_BOT_TOKEN,
      channel: channelId,
      text: `:wave: Hey, <@${body.user.id}> ！`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<@${body.user.id}>さんが提出したよ！\n問題: *${data.note}* \n難易度判定: ${data.level} \n解法発意スピード: ${data.ideaTime} \n質問:${data.question}`,
          },
        },
      ],
    });
  } catch (e) {
    app.error(e);
  }
});

// respondからmodalに変更したい
app.action("kadai-submit", async ({ ack, body, context }) => {
  await ack();
  // const blocks = await kadaiMeesage();
  const note = body.actions[0].value;

  try {
    const result = await app.client.views.open({
      token: context.botToken,
      trigger_id: body.trigger_id,
      view: {
        type: "modal",
        callback_id: "kadai_post",
        title: {
          type: "plain_text",
          text: `${note}`,
        },
        submit: {
          type: "plain_text",
          text: "Submit",
          emoji: true,
        },
        close: {
          type: "plain_text",
          text: "Close",
        },
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "About the simplest modal you could conceive of :smile:\n\nMaybe <https://api.slack.com/reference/block-kit/interactive-components|*make the modal interactive*> or <https://api.slack.com/surfaces/modals/using#modifying|*learn more advanced modal use cases*>.",
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: "Psssst this modal was designed using <https://api.slack.com/tools/block-kit-builder|*Block Kit Builder*>",
              },
            ],
          },
          {
            type: "input",
            block_id: "kadai-level",
            label: {
              type: "plain_text",
              text: "課題の難易度を選択 (必須)",
            },
            element: {
              type: "static_select",
              action_id: "category",
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "🔥",
                  },
                  value: "easy,easy",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "🔥🔥",
                  },
                  value: "ぼちぼちやね",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "🔥🔥🔥",
                  },
                  value: "ムズイわ！",
                },
              ],
            },
          },
          {
            type: "input",
            block_id: "kadai-idea",
            label: {
              type: "plain_text",
              text: "解法はすぐに思い浮かびましたか？ (必須)",
            },
            element: {
              type: "static_select",
              action_id: "category",
              options: [
                {
                  text: {
                    type: "plain_text",
                    text: "一瞬で思いついた！",
                  },
                  value: "blink an eyes!",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "2~3分考えた",
                  },
                  value: "bring me on!",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "5~10分考えた",
                  },
                  value: "tough one...",
                },
                {
                  text: {
                    type: "plain_text",
                    text: "全く思いつかなかった",
                  },
                  value: "珍紛漢紛",
                },
              ],
            },
          },
          {
            type: "input",
            block_id: "kadai-question",
            element: {
              type: "plain_text_input",
              action_id: "my_action",
              placeholder: {
                type: "plain_text",
                text: "Don't hesitate to ask any questions!",
              },
            },
            label: {
              type: "plain_text",
              text: "気軽にじゃんじゃん質問してください",
              emoji: true,
            },
            optional: true,
          },
        ],
      },
    });
  } catch (e) {
    console.log(e);
    app.error(e);
  }
});

(async () => {
  // アプリを起動します
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();

const updateView = async (user) => {
  // Intro message -
  let blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Welcome!* \nここで課題を確認できるよ📑 \n解き直して理解を深めよう!!",
      },
      accessory: {
        type: "button",
        action_id: "add_note",
        text: {
          type: "plain_text",
          text: "✒️ 課題を作成する",
          emoji: true,
        },
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: ":wave: 課題の表示件数は100件だよ",
        },
      ],
    },
    {
      type: "divider",
    },
  ];

  // Append new data blocks after the intro -
  let newData = [];

  try {
    const rawData = await supabase.from("slack-kadai").select("*");

    newData = rawData.data.slice().reverse(); // Reverse to make the latest first
    newData = newData.slice(0, 50); // Just display 20. BlockKit display has some limit.
  } catch (error) {
    console.error(error);
  }

  if (newData) {
    let noteBlocks = [];

    newData.map((o) => {
      let note = o.note;
      if (note.length > 3000) {
        note = note.substr(0, 2980) + "... _(truncated)_";
        console.log(note.length);
      }

      const url = o.url;
      let ts = new Date(o.created_at).toLocaleString();

      noteBlocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${note} \n ${url} `,
          },
        },
        {
          type: "image",
          title: {
            type: "plain_text",
            text: "📸",
            emoji: true,
          },
          image_url: url,
          alt_text: "kadai",
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `⌚︎ ${ts}`,
            },
          ],
        },
        {
          type: "divider",
        },
      ];
      blocks = [...blocks, ...noteBlocks];
    });
  }

  // The final view -
  let view = {
    type: "home",
    callback_id: "home_view",
    title: {
      type: "plain_text",
      text: "Keep notes!",
    },
    blocks: blocks,
  };
  return JSON.stringify(view);
};

/* Display App Home */
const createHome = async (user, data) => {
  if (data) {
    await supabase
      .from("slack-kadai")
      .insert([{ note: data.note, category: data.category, url: data.url }]);
  }

  const userView = await updateView(user);

  return userView;
};

/* Open a modal */
const openModal = () => {
  const modal = {
    type: "modal",
    callback_id: "modal_view",
    title: {
      type: "plain_text",
      text: "課題を作成する",
    },
    submit: {
      type: "plain_text",
      text: "Create",
    },
    blocks: [
      // Text input
      {
        type: "input",
        block_id: "note01",
        label: {
          type: "plain_text",
          text: "課題内容",
        },
        element: {
          action_id: "content",
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "a new assignment... \n(Text longer than 3000 characters will be truncated!)",
          },
          multiline: true,
        },
      },

      // image url
      {
        type: "input",
        block_id: "note02",
        label: {
          type: "plain_text",
          text: "課題URL",
        },
        element: {
          action_id: "img_url",
          type: "plain_text_input",
          placeholder: {
            type: "plain_text",
            text: "url for an assignment",
          },
        },
      },

      // Drop-down menu
      {
        type: "input",
        block_id: "note03",
        label: {
          type: "plain_text",
          text: "Categories",
        },
        element: {
          type: "static_select",
          action_id: "category",
          options: [
            {
              text: {
                type: "plain_text",
                text: "math1a",
              },
              value: "math1a",
            },
            {
              text: {
                type: "plain_text",
                text: "math2b",
              },
              value: "math2b",
            },
            {
              text: {
                type: "plain_text",
                text: "math3",
              },
              value: "math3",
            },
            {
              text: {
                type: "plain_text",
                text: "english",
              },
              value: "math1a",
            },
          ],
        },
      },
      {
        type: "section",
        block_id: "section678",
        text: {
          type: "mrkdwn",
          text: "投稿先をドロップダウンから選択",
        },
        accessory: {
          action_id: "user_select",
          type: "conversations_select",
          placeholder: {
            type: "plain_text",
            text: "投稿先を選択",
          },
          filter: {
            include: ["public", "private"],
            exclude_bot_users: true,
          },
        },
      },
    ],
  };

  return modal;
};

const kadaiView = (note, url) => {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:wave: *新しい課題のお届けです！*`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "image",
          image_url:
            "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
          alt_text: "placeholder",
        },
      ],
    },

    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `📰 *本日の課題* \n ${note}`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "image",
      title: {
        type: "plain_text",
        text: "📸",
        emoji: true,
      },
      image_url: url,
      alt_text: "kadai",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "分からないときは課題のヒントを見よう! \n 👉 <https://google.com|課題のヒントはこちら>",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "image",
          image_url:
            "https://api.slack.com/img/blocks/bkb_template_images/placeholder.png",
          alt_text: "placeholder",
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "課題が終わったら👇のボタンから課題レビューを作成してね！",
        },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🚀 課題レビュー作成 🚀",
            emoji: true,
          },
          style: "primary",
          value: `${note}`,
          action_id: "kadai-submit",
        },
      ],
    },
  ];
  return JSON.stringify(blocks);
  // return blocks;
};

// const kadaiSubmit = (text) => {
//   // body.message.text => text
//   const blocks = [
//     {
//       type: "section",
//       block_id: "kadai-q",
//       text: { type: "mrkdwn", text: `問題: _${text}_` },
//     },
//     {
//       type: "input",
//       block_id: "kadai-level",
//       label: {
//         type: "plain_text",
//         text: "課題の難易度を選択 (必須)",
//       },
//       element: {
//         type: "static_select",
//         action_id: "category",
//         options: [
//           {
//             text: {
//               type: "plain_text",
//               text: "🔥",
//             },
//             value: "easy,easy",
//           },
//           {
//             text: {
//               type: "plain_text",
//               text: "🔥🔥",
//             },
//             value: "ぼちぼちやね",
//           },
//           {
//             text: {
//               type: "plain_text",
//               text: "🔥🔥🔥",
//             },
//             value: "ムズイわ！",
//           },
//         ],
//       },
//     },
//     {
//       type: "input",
//       block_id: "kadai-idea",
//       label: {
//         type: "plain_text",
//         text: "解法はすぐに思い浮かびましたか？ (必須)",
//       },
//       element: {
//         type: "static_select",
//         action_id: "category",
//         options: [
//           {
//             text: {
//               type: "plain_text",
//               text: "一瞬で思いついた！",
//             },
//             value: "blink an eyes!",
//           },
//           {
//             text: {
//               type: "plain_text",
//               text: "2~3分考えた",
//             },
//             value: "bring me on!",
//           },
//           {
//             text: {
//               type: "plain_text",
//               text: "5~10分考えた",
//             },
//             value: "tough one...",
//           },
//           {
//             text: {
//               type: "plain_text",
//               text: "全く思いつかなかった",
//             },
//             value: "珍紛漢紛",
//           },
//         ],
//       },
//     },
//     {
//       type: "section",
//       text: { type: "mrkdwn", text: "この内容で提出しますか？" },

//       accessory: {
//         type: "button",
//         action_id: "start_button",
//         text: {
//           type: "plain_text",
//           text: "提出する",
//         },
//         style: "primary",
//         value: `${text}`,
//       },
//     },
//     {
//       type: "divider",
//     },
//     {
//       type: "section",
//       text: { type: "mrkdwn", text: "質問がある場合はこちら" },
//       accessory: {
//         type: "button",
//         action_id: "start_question",
//         text: {
//           type: "plain_text",
//           text: "質問する",
//         },
//         style: "primary",
//         value: `${text}`,
//       },
//     },
//     {
//       type: "context",
//       elements: [
//         {
//           type: "mrkdwn",
//           text: "質問する場合、質問ページ上で課題提出ができます。",
//         },
//       ],
//     },
//   ];
//   return JSON.stringify(blocks);
// };
