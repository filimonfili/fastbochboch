import { withdrawalSessions } from "../sessions/sessions.js";
import { createWithdrawal } from "../../services/withdrawalService.js";

export const registerWithdrawalCallbacks = (bot) => {
  bot.on("callback_query", async (query) => {
    if (!query.message) return;

    const action = query.data;
    const chatId = query.message.chat.id;

    const withdrawalActions = [
      "withdraw_telebirr",
      "withdraw_cbe_birr",
      "withdraw_cancel",
      "withdraw_confirm",
    ];

    if (!withdrawalActions.includes(action)) return;

    try {
      await bot.answerCallbackQuery(query.id);

      // CANCEL
      if (action === "withdraw_cancel") {
        withdrawalSessions.delete(chatId);

        await bot.sendMessage(chatId, "❌ የገንዘብ ማውጣት ሂደቱ ተሰርዟል።");

        return;
      }

      // GET SESSION
      const session = withdrawalSessions.get(chatId);

      if (!session) {
        await bot.sendMessage(
          chatId,
          `⚠️ የገንዘብ ማውጣት ክፍለ-ጊዜዎ ጊዜው አልፎበታል።

እባክዎ የገንዘብ ማውጣት ቁልፉን እንደገና ይጫኑ።`,
        );

        return;
      }

      // TELEBIRR
      if (action === "withdraw_telebirr") {
        withdrawalSessions.set(chatId, {
          ...session,
          paymentMethod: "TELEBIRR",
          step: "AMOUNT",
        });

        await bot.sendMessage(
          chatId,
          `📱 ቴሌብር ማውጣት

💰 ሊጠቀምበት የሚቻል ቀሪ ሂሳብ:
${session.balance} ብር

ማውጣት የሚፈልጉትን መጠን ያስገቡ።

ምሳሌ፦
100

ለመሰረዝ /cancel ብለው ይላኩ።`,
        );

        return;
      }

      // CBE BIRR
      if (action === "withdraw_cbe_birr") {
        withdrawalSessions.set(chatId, {
          ...session,
          paymentMethod: "CBE_BIRR",
          step: "AMOUNT",
        });

        await bot.sendMessage(
          chatId,
          `🏦 የCBE Birr ገንዘብ ማውጣት

💰 ሊጠቀምበት የሚቻል ቀሪ ሂሳብ:
${session.balance} ብር

ማውጣት የሚፈልጉትን መጠን ያስገቡ።

ምሳሌ፦
100

ለመሰረዝ /cancel ብለው ይላኩ።`,
        );

        return;
      }

      // CONFIRM WITHDRAWAL
      if (action === "withdraw_confirm") {
        if (
          session.step !== "CONFIRM" ||
          !session.userId ||
          !session.amount ||
          !["TELEBIRR", "CBE_BIRR"].includes(session.paymentMethod) ||
          !session.accountNumber
        ) {
          withdrawalSessions.delete(chatId);

          await bot.sendMessage(
            chatId,
            `⚠️ የገንዘብ ማውጣት ክፍለ-ጊዜዎ ትክክለኛ አይደለም ወይም ጊዜው አልፎበታል።

እባክዎ የገንዘብ ማውጣት ሂደቱን እንደገና ይጀምሩ።`,
          );

          return;
        }

        console.log("💸 Creating withdrawal:", {
          chatId,
          userId: session.userId,
          amount: session.amount,
          paymentMethod: session.paymentMethod,
          accountNumber: session.accountNumber,
        });

        let result;

        try {
          result = await createWithdrawal({
            userId: session.userId,
            amount: session.amount,
            paymentMethod: session.paymentMethod,
            accountNumber: session.accountNumber,
          });
        } catch (error) {
          console.error("❌ Withdrawal creation failed:", error);

          console.error("MESSAGE:", error?.message);
          console.error("DETAILS:", error?.details);
          console.error("HINT:", error?.hint);
          console.error("CODE:", error?.code);

          const errorMessage = [error?.message, error?.details, error?.hint]
            .filter(Boolean)
            .join(" ");

          if (errorMessage.includes("NO_BALANCE")) {
            withdrawalSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `❌ በሂሳብዎ ውስጥ ገንዘብ የለም።

የሂሳብ ቀሪዎ 0 ብር ስለሆነ፣ ገንዘብ የማውጣት ጥያቄዎን ማስገባት አልተቻለም።`,
            );

            return;
          }

          if (errorMessage.includes("INSUFFICIENT_BALANCE")) {
            withdrawalSessions.delete(chatId);

            await bot.sendMessage(
              chatId,
              `❌ በቂ ቀሪ ሂሳብ የለም።

ያለዎት ቀሪ ሂሳብ ለዚህ ገንዘብ ማውጣት በቂ አይደለም።

እባክዎ የገንዘብ ማውጣት ሂደቱን እንደገና ይጀምሩ።`,
            );

            return;
          }

          await bot.sendMessage(
            chatId,
            `❌ የገንዘብ ማውጣት ጥያቄዎን ማስገባት አልቻልንም።

ገንዘብዎ አልወጣም።

እባክዎ እንደገና ይሞክሩ።`,
          );

          return;
        }

        // CLEAR SESSION AFTER SUCCESS
        withdrawalSessions.delete(chatId);

        // PAYMENT NAME
        const paymentName =
          session.paymentMethod === "TELEBIRR" ? "Telebirr" : "CBE Birr";

        const withdrawalId = result?.withdrawal_id ?? "N/A";

        // PLAYER CONFIRMATION
        await bot.sendMessage(
          chatId,
          `✅ የማውጣት ጥያቄ ቀርቧል።

💰 መጠን:
${session.amount} ብር

📱 የክፍያ ዘዴ:
${paymentName}

📞 ቁጥር:
${session.accountNumber}

⏳ ሁኔታ:
በሂደት ላይ

🆔 የጥያቄ ቁጥር:
${withdrawalId}

የገንዘብ ማውጣት ጥያቄዎ ለሂደት ተልኳል።

እባክዎ ከአስተዳዳሪው የሚሰጠውን ማረጋገጫ ይጠብቁ።`,
        );

        console.log("✅ Withdrawal created successfully:", result);

        return;
      }
    } catch (error) {
      console.error("❌ Withdrawal callback error:", error);

      try {
        await bot.sendMessage(chatId, "❌ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።");
      } catch (sendError) {
        console.error("❌ Failed to send withdrawal error:", sendError);
      }
    }
  });
};
