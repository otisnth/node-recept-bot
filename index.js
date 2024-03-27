import amqplib from "amqplib";
import fs from "fs";
import dotenv from "dotenv";
import { Telegraf, Scenes, session, Markup, Input } from "telegraf";
import { Client } from "basic-ftp";

dotenv.config();
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const rabbit = amqplib.connect(process.env.RABBIT_URL);

// Определения клавиатур
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

// Функции для работы с FTP

async function downloadFromFTP(localPath, remotePath) {
    const client = new Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_URL,
            user: process.env.FTP_LOGIN,
            password: process.env.FTP_PASS,
        });
        await client.downloadTo(localPath, remotePath);
    } catch (err) {
        console.log(err);
    }
    client.close();
}

async function removeFromFTP(remotePath) {
    const client = new Client();
    client.ftp.verbose = true;
    try {
        await client.access({
            host: process.env.FTP_URL,
            user: process.env.FTP_LOGIN,
            password: process.env.FTP_PASS,
        });
        await client.remove(remotePath);
    } catch (err) {
        console.log(err);
    }
    client.close();
}

// Работа кролика
rabbit
    .then(function (connection) {
        var ok = connection.createChannel();
        ok.then(function (channel) {
            // Конфигурация кролика
            channel.assertQueue("receptRequest");
            channel.assertQueue("receptResponse");
            channel.assertExchange("recept");
            channel.bindQueue("receptRequest", "recept", "rreq");
            channel.bindQueue("receptResponse", "recept", "rres");

            let msgUpd;
            // Сцена формы запроса рецептов
            const receptForm = new Scenes.WizardScene(
                "receptForm",
                async (ctx) => {
                    msgUpd = await ctx.reply("⚙️Выбранные параметры: ", removeKeyboard);
                    await ctx.reply("Выберите желаемую кухню: ", countryKeyboard);
                    ctx.wizard.state.data = {};
                    return ctx.wizard.next();
                },
                async (ctx) => {
                    if (!ctx.callbackQuery) {
                        if (ctx.message.text === "/start") return ctx.scene.leave();
                        await ctx.deleteMessage();

                        return;
                    }

                    const callbackData = JSON.parse(ctx.callbackQuery.data);
                    ctx.wizard.state.messageText = `🌍${callbackData.title} кухня \n`;
                    await ctx.editMessageText(ctx.wizard.state.messageText + "Выберите тип блюда: ", mealTypesKeyboard);

                    ctx.wizard.state.data.country = callbackData.country;

                    return ctx.wizard.next();
                },
                async (ctx) => {
                    if (!ctx.callbackQuery) {
                        if (ctx.message.text === "/start") return ctx.scene.leave();
                        await ctx.deleteMessage();

                        return;
                    }

                    const callbackData = JSON.parse(ctx.callbackQuery.data);
                    ctx.wizard.state.messageText += `🍽️Тип блюда: ${callbackData.title}\n`;
                    msgUpd = await ctx.editMessageText(
                        ctx.wizard.state.messageText + "Введите желаемое количество рецептов (1-10): "
                    );

                    ctx.wizard.state.data.type = callbackData.mealType;

                    return ctx.wizard.next();
                },
                async (ctx) => {
                    if (ctx.message.text === "/start") return ctx.scene.leave();
                    if (isNaN(ctx.message.text)) {
                        await ctx.telegram.editMessageText(
                            msgUpd.chat.id,
                            msgUpd.message_id,
                            undefined,
                            ctx.wizard.state.messageText +
                                "Введите желаемое количество рецептов (1-10): \n❗Введите число"
                        );
                        await ctx.deleteMessage();

                        return;
                    }
                    if (ctx.message.text > 10 || ctx.message.text < 1) {
                        await ctx.telegram.editMessageText(
                            msgUpd.chat.id,
                            msgUpd.message_id,
                            undefined,
                            ctx.wizard.state.messageText +
                                "Введите желаемое количество рецептов (1-10): \n❗Введите число в диапазоне 1-10"
                        );
                        await ctx.deleteMessage();

                        return;
                    }
                    await ctx.deleteMessage();
                    ctx.wizard.state.data.count = ctx.message.text;
                    ctx.wizard.state.data.telegram_id = ctx.update.message.chat.id;

                    ctx.wizard.state.messageText += `📋Количество рецептов: ${ctx.message.text}\n`;

                    await ctx.telegram.editMessageText(
                        msgUpd.chat.id,
                        msgUpd.message_id,
                        undefined,
                        ctx.wizard.state.messageText
                    );

                    channel.publish("recept", "rreq", Buffer.from(JSON.stringify(ctx.wizard.state.data)));
                    ctx.wizard.state.messageText += `✅Запрос успешно отправлен! Ожидайте`;
                    await ctx.telegram.editMessageText(
                        msgUpd.chat.id,
                        msgUpd.message_id,
                        undefined,
                        ctx.wizard.state.messageText
                    );

                    return ctx.scene.leave();
                }
            );

            receptForm.leave(async (ctx) => {
                await ctx.reply("Выберите следующее действие", getReceptKeyboard);
            });

            // Конфигурация бота
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

            channel.consume("receptResponse", async function (message) {
                let data = JSON.parse(message.content.toString());
                if (data.status === "error") {
                    await bot.telegram.sendMessage(data.telegram_id, "❗" + data.message);
                    channel.ack(message);
                    return;
                }
                try {
                    await downloadFromFTP(`./storage/${data.file.split("/").at(-1)}`, data.file);
                    await bot.telegram.sendDocument(
                        data.telegram_id,
                        Input.fromLocalFile(`./storage/${data.file.split("/").at(-1)}`),
                        { caption: "📕Ваша подборка рецептов!" }
                    );
                    fs.unlinkSync(`./storage/${data.file.split("/").at(-1)}`);
                    await removeFromFTP(data.file);
                } catch (err) {
                    if (data?.telegram_id) {
                        await bot.telegram.sendMessage(
                            data.telegram_id,
                            "❗Произошла ошибка при загрузке файла. Попробуйте еще раз"
                        );
                    }
                }
                channel.ack(message);
            });
        });
        return ok;
    })
    .then(null, console.log);
