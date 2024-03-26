import amqplib from "amqplib";
import dotenv from "dotenv";
import { Telegraf, Scenes, session, Markup } from "telegraf";
import { Client } from "basic-ftp";

dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const rabbit = amqplib.connect(process.env.RABBIT_URL);

const countryKeyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback("🇨🇳", JSON.stringify({ title: "🇨🇳 Китайская", country: "Chinese" }), false),
        Markup.button.callback("🇮🇱", JSON.stringify({ title: "🇮🇱 Израильская", country: "Jewish" }), false),
        Markup.button.callback("🇩🇪", JSON.stringify({ title: "🇩🇪 Немецкая", country: "German" }), false),
        Markup.button.callback("🇪🇸", JSON.stringify({ title: "🇪🇸 Испанская", country: "Spanish" }), false),
    ],
    [
        Markup.button.callback("🇪🇺", JSON.stringify({ title: "🇪🇺 Европейская", country: "European" }), false),
        Markup.button.callback("🇫🇷", JSON.stringify({ title: "🇫🇷 Французская", country: "French" }), false),
        Markup.button.callback("🇬🇧", JSON.stringify({ title: "🇬🇧 Британская", country: "British" }), false),
        Markup.button.callback("🇬🇷", JSON.stringify({ title: "🇬🇷 Греческая", country: "Greek" }), false),
    ],
    [
        Markup.button.callback("🇮🇳", JSON.stringify({ title: "🇮🇳 Индийская", country: "Indian" }), false),
        Markup.button.callback("🇮🇪", JSON.stringify({ title: "🇮🇪 Ирландская", country: "Irish" }), false),
        Markup.button.callback("🇮🇹", JSON.stringify({ title: "🇮🇹 Итальянская", country: "Italian" }), false),
        Markup.button.callback("🇯🇵", JSON.stringify({ title: "🇯🇵 Японская", country: "Japanese" }), false),
    ],
    [
        Markup.button.callback("🇰🇷", JSON.stringify({ title: "🇰🇷 Корейская", country: "Korean" }), false),
        Markup.button.callback("🇲🇽", JSON.stringify({ title: "🇲🇽 Мексиканская", country: "Mexican" }), false),
        Markup.button.callback("🇹🇭", JSON.stringify({ title: "🇹🇭 Тайская", country: "Thai" }), false),
        Markup.button.callback("🇺🇸", JSON.stringify({ title: "🇺🇸 Американская", country: "American" }), false),
    ],
]).resize();

const mealTypesKeyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback(
            "Основное блюдо",
            JSON.stringify({ a: "selectMealType", mealType: "main course" }),
            false
        ),
        Markup.button.callback("Гарнир", JSON.stringify({ a: "selectMealType", mealType: "side dish" }), false),
    ],
    [
        Markup.button.callback("Десерт", JSON.stringify({ a: "selectMealType", mealType: "dessert" }), false),
        Markup.button.callback("Закуска", JSON.stringify({ a: "selectMealType", mealType: "appetizer" }), false),
    ],
    [
        Markup.button.callback("Салат", JSON.stringify({ a: "selectMealType", mealType: "salad" }), false),

        Markup.button.callback("Напиток", JSON.stringify({ a: "selectMealType", mealType: "drink" }), false),
    ],
    [
        Markup.button.callback("Завтрак", JSON.stringify({ a: "selectMealType", mealType: "breakfast" }), false),
        Markup.button.callback("Суп", JSON.stringify({ a: "selectMealType", mealType: "soup" }), false),
    ],
    [
        Markup.button.callback("Соус", JSON.stringify({ a: "selectMealType", mealType: "sauce" }), false),
        Markup.button.callback("Выпечка", JSON.stringify({ a: "selectMealType", mealType: "bread" }), false),
    ],
]);

const receptForm = new Scenes.WizardScene(
    "receptForm",
    async (ctx) => {
        await ctx.reply("Выберите желаемую кухню: ", countryKeyboard);
        ctx.wizard.state.data = {};
        return ctx.wizard.next();
    },
    async (ctx) => {
        console.log(ctx.update.callback_query.message);
        // await ctx.deleteMessage();
        if (!ctx.callbackQuery) {
            return;
        }
        const callbackData = JSON.parse(ctx.callbackQuery.data);
        // console.log(ctx.callbackQuery.data);
        // await ctx.reply(ctx.i18n.t("scenes.report.form.selectedInjury", { name: typeInjury.dataValues.name }));
        // ctx.wizard.state.data.injury = typeInjury.dataValues.id;
        // await ctx.reply(ctx.i18n.t("scenes.report.form.getDescription"), getSkipDescriptionKeyboard(ctx));
        return ctx.wizard.next();
    },
    // async (ctx) => {
    //     if (!/^\d{4}\-\d{2}\-\d{2}$/.test(ctx.message.text)) {
    //         await ctx.reply(ctx.i18n.t("scenes.report.errors.formatDate"));
    //         return;
    //     }
    //     if (!moment(ctx.message.text, "YYYY-MM-DD").isValid()) {
    //         await ctx.reply(ctx.i18n.t("scenes.report.errors.invalidDate"));
    //         return;
    //     }
    //     ctx.wizard.state.data.date = ctx.message.text;
    //     await ctx.reply(ctx.i18n.t("scenes.report.form.getInjury"), typeInjuryKeyboard);
    //     return ctx.wizard.next();
    // },
    // async (ctx) => {
    //     await ctx.deleteMessage();
    //     if (!ctx.callbackQuery) {
    //         return;
    //     }
    //     const callbackData = JSON.parse(ctx.callbackQuery.data);
    //     const typeInjury = await TypeInjury.findByPk(callbackData.id);
    //     await ctx.reply(ctx.i18n.t("scenes.report.form.selectedInjury", { name: typeInjury.dataValues.name }));
    //     ctx.wizard.state.data.injury = typeInjury.dataValues.id;
    //     await ctx.reply(ctx.i18n.t("scenes.report.form.getDescription"), getSkipDescriptionKeyboard(ctx));
    //     return ctx.wizard.next();
    // },
    async (ctx) => {
        // if (ctx.callbackQuery) {
        //     await ctx.deleteMessage();
        //     ctx.wizard.state.data.description = "";
        // } else {
        //     ctx.wizard.state.data.description = ctx.message.text;
        // }
        // let incident = Incident.build({
        //     fullName: ctx.wizard.state.data.fullName,
        //     date: ctx.wizard.state.data.date,
        //     injury: ctx.wizard.state.data.injury,
        //     description: ctx.wizard.state.data.description,
        // });
        // if (ctx.session["reportLocation"].type === "room") {
        //     incident.room = ctx.session["reportLocation"].id;
        // } else {
        //     incident.order = ctx.session["reportLocation"].id;
        // }
        // await incident.save();
        return ctx.scene.leave();
    }
);

// receptForm.leave(async (ctx) => {
//     await ctx.reply(ctx.i18n.t("scenes.start.nextStep"), getMainKeyboard(ctx));
// });

const stage = new Scenes.Stage([receptForm]);

bot.use(session());
bot.use(stage.middleware());

bot.telegram.setMyCommands([
    { command: "start", description: "На главную" },
    { command: "help", description: "Помощь" },
]);

bot.start(async (ctx) => {
    await ctx.reply("Добро пожаловать в ВВС!");
    await ctx.scene.enter("receptForm");
});

bot.help(async (ctx) => {
    await ctx.reply("Для начала работы введите /start");
});

bot.launch();

// rabbit
//     .then(function (connection) {
//         var ok = connection.createChannel();
//         ok.then(function (channel) {
//             // durable: true is set by default
//             channel.assertQueue("messages");
//             channel.assertExchange("incoming");
//             channel.bindQueue("messages", "incoming", "mda");
//             channel.consume("messages", function (message) {
//                 console.log(message.content.toString());
//                 channel.ack(message);
//             });
//         });
//         return ok;
//     })
//     .then(null, console.log);

// rabbit
//     .then(function (connection) {
//         var ok = connection.createChannel();
//         ok.then(function (channel) {
//             // durable: true is set by default
//             channel.assertQueue("messages");
//             channel.assertExchange("incoming");
//             channel.bindQueue("messages", "incoming", "mda");
//             for (let i = 0; i < 1000; i++) channel.sendToQueue("messages", Buffer.from("Hello "));
//         });
//         return ok;
//     })
//     .then(null, console.log);
