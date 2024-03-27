import amqplib from "amqplib";
import dotenv from "dotenv";
import { Telegraf, Scenes, session, Markup } from "telegraf";
import { Client } from "basic-ftp";

dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const rabbit = amqplib.connect(process.env.RABBIT_URL);

const countryKeyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback("🇨🇳", JSON.stringify({ title: "Китайская", country: "Chinese" }), false),
        Markup.button.callback("🇮🇱", JSON.stringify({ title: "Израильская", country: "Jewish" }), false),
        Markup.button.callback("🇩🇪", JSON.stringify({ title: "Немецкая", country: "German" }), false),
        Markup.button.callback("🇪🇸", JSON.stringify({ title: "Испанская", country: "Spanish" }), false),
    ],
    [
        Markup.button.callback("🇪🇺", JSON.stringify({ title: "Европейская", country: "European" }), false),
        Markup.button.callback("🇫🇷", JSON.stringify({ title: "Французская", country: "French" }), false),
        Markup.button.callback("🇬🇧", JSON.stringify({ title: "Британская", country: "British" }), false),
        Markup.button.callback("🇬🇷", JSON.stringify({ title: "Греческая", country: "Greek" }), false),
    ],
    [
        Markup.button.callback("🇮🇳", JSON.stringify({ title: "Индийская", country: "Indian" }), false),
        Markup.button.callback("🇮🇪", JSON.stringify({ title: "Ирландская", country: "Irish" }), false),
        Markup.button.callback("🇮🇹", JSON.stringify({ title: "Итальянская", country: "Italian" }), false),
        Markup.button.callback("🇯🇵", JSON.stringify({ title: "Японская", country: "Japanese" }), false),
    ],
    [
        Markup.button.callback("🇰🇷", JSON.stringify({ title: "Корейская", country: "Korean" }), false),
        Markup.button.callback("🇲🇽", JSON.stringify({ title: "Мексиканская", country: "Mexican" }), false),
        Markup.button.callback("🇹🇭", JSON.stringify({ title: "Тайская", country: "Thai" }), false),
        Markup.button.callback("🇺🇸", JSON.stringify({ title: "Американская", country: "American" }), false),
    ],
]).resize();

const mealTypesKeyboard = Markup.inlineKeyboard([
    [
        Markup.button.callback(
            "Основное блюдо",
            JSON.stringify({ title: "Основное блюдо", mealType: "main course" }),
            false
        ),
        Markup.button.callback("Гарнир", JSON.stringify({ title: "Гарнир", mealType: "side dish" }), false),
    ],
    [
        Markup.button.callback("Десерт", JSON.stringify({ title: "Десерт", mealType: "dessert" }), false),
        Markup.button.callback("Закуска", JSON.stringify({ title: "Закуска", mealType: "appetizer" }), false),
    ],
    [
        Markup.button.callback("Салат", JSON.stringify({ title: "Салат", mealType: "salad" }), false),
        Markup.button.callback("Напиток", JSON.stringify({ title: "Напиток", mealType: "drink" }), false),
    ],
    [
        Markup.button.callback("Завтрак", JSON.stringify({ title: "Завтрак", mealType: "breakfast" }), false),
        Markup.button.callback("Суп", JSON.stringify({ title: "Суп", mealType: "soup" }), false),
    ],
    [
        Markup.button.callback("Соус", JSON.stringify({ title: "Соус", mealType: "sauce" }), false),
        Markup.button.callback("Выпечка", JSON.stringify({ title: "Выпечка", mealType: "bread" }), false),
    ],
]);

const getReceptKeyboard = Markup.keyboard(["Получить рецепты"]).resize();
const removeKeyboard = Markup.removeKeyboard();
const toMainKeyboard = Markup.keyboard(["На главную"]).resize();

const receptForm = new Scenes.WizardScene(
    "receptForm",

    async (ctx) => {
        await ctx.reply("Выбранные параметры: ", toMainKeyboard);
        await ctx.reply("Выберите желаемую кухню: ", countryKeyboard);
        ctx.wizard.state.data = {};
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) {
            if (ctx.message.text === "На главную") return ctx.scene.leave();
            return;
        }
        await ctx.deleteMessage();
        const callbackData = JSON.parse(ctx.callbackQuery.data);
        await ctx.reply(`${callbackData.title} кухня`);
        ctx.wizard.state.data.country = callbackData.country;
        await ctx.reply("Выберите тип блюда: ", mealTypesKeyboard);
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (!ctx.callbackQuery) {
            if (ctx.message.text === "На главную") return ctx.scene.leave();
            return;
        }
        await ctx.deleteMessage();

        const callbackData = JSON.parse(ctx.callbackQuery.data);
        await ctx.reply(`${callbackData.title} тип блюда`);
        ctx.wizard.state.data.type = callbackData.mealType;
        await ctx.reply("Введите желаемое количество рецептов (1-10): ");
        return ctx.wizard.next();
    },
    async (ctx) => {
        if (ctx.message.text === "На главную") return ctx.scene.leave();
        if (isNaN(ctx.message.text)) {
            await ctx.reply("Введите корректное число");
            await ctx.deleteMessage();

            return;
        }
        if (ctx.message.text > 10 || ctx.message.text < 1) {
            await ctx.reply("Введите число в диапазоне 1-10");
            await ctx.deleteMessage();

            return;
        }
        await ctx.deleteMessage();
        ctx.wizard.state.data.count = ctx.message.text;
        ctx.wizard.state.data.telegram_id = ctx.update.message.chat.id;

        await ctx.reply(`Количество рецептов: ${ctx.message.text}`);
        console.log(ctx.wizard.state.data);
        return ctx.scene.leave();
    }
);

receptForm.leave(async (ctx) => {
    await ctx.reply("Добро пожаловать в ВВС!", getReceptKeyboard);
});

const stage = new Scenes.Stage([receptForm]);

bot.use(session());
bot.use(stage.middleware());

bot.telegram.setMyCommands([
    { command: "start", description: "На главную" },
    { command: "help", description: "Помощь" },
]);

bot.start(async (ctx) => {
    await ctx.reply("Добро пожаловать в ВВС!", getReceptKeyboard);
});

bot.help(async (ctx) => {
    await ctx.reply("Для начала работы введите /start");
});

bot.hears("Получить рецепты", async (ctx) => await ctx.scene.enter("receptForm"));

bot.hears("На главную", async (ctx) => await ctx.reply("Добро пожаловать в ВВС!", getReceptKeyboard));

bot.launch();
