import { EconomyManager } from "../sql";
import { parseId } from "../utility/index.mjs";

const TAX_RATE = 0.05; // 5% tax on transfers

const formatMoney = (amount) => {
  return "$" + amount.toLocaleString();
};

const parseUser = (id) => "@" + id.split("@")[0];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default [
  {
    pattern: "balance",
    alias: ["bal", "money"],
    category: "economy",
    function: async (msg, args) => {
      const userId = args
        ? (await parseId(msg, args)) || msg.sender
        : msg.sender;
      const eco = await EconomyManager.get(msg.session, userId);

      return msg.client.sendMessage(msg.chat, {
        text: `*💰 Bank Account: ${parseUser(userId)}*\n\n💵 *Wallet:* ${formatMoney(eco.balance)}\n🏦 *Bank:* ${formatMoney(eco.bank)}\n💎 *Net Worth:* ${formatMoney(eco.balance + eco.bank)}`,
        mentions: [userId],
      });
    },
  },
  {
    pattern: "deposit",
    alias: ["dep"],
    category: "economy",
    function: async (msg, args) => {
      const eco = await EconomyManager.get(msg.session, msg.sender);
      let amount = 0;

      if (args?.toLowerCase() === "all") {
        amount = eco.balance;
      } else {
        amount = parseInt(args?.replace(/,/g, "") || "0");
      }

      if (!amount || amount <= 0) return msg.reply("Usage: !dep <amount|all>");
      if (amount > eco.balance)
        return msg.reply("You don't have enough money in your wallet.");

      await EconomyManager.update(msg.session, msg.sender, {
        balance: BigInt(eco.balance) - BigInt(amount),
        bank: BigInt(eco.bank) + BigInt(amount),
      });

      return msg.reply(`✅ Deposited ${formatMoney(amount)} to your bank.`);
    },
  },
  {
    pattern: "withdraw",
    alias: ["wd"],
    category: "economy",
    function: async (msg, args) => {
      const eco = await EconomyManager.get(msg.session, msg.sender);
      let amount = 0;

      if (args?.toLowerCase() === "all") {
        amount = eco.bank;
      } else {
        amount = parseInt(args?.replace(/,/g, "") || "0");
      }

      if (!amount || amount <= 0) return msg.reply("Usage: !wd <amount|all>");
      if (amount > eco.bank)
        return msg.reply("You don't have enough money in your bank.");

      await EconomyManager.update(msg.session, msg.sender, {
        balance: BigInt(eco.balance) + BigInt(amount),
        bank: BigInt(eco.bank) - BigInt(amount),
      });

      return msg.reply(`✅ Withdrew ${formatMoney(amount)} from your bank.`);
    },
  },
  {
    pattern: "pay",
    alias: ["transfer", "give"],
    category: "economy",
    function: async (msg, args) => {
      const target = await parseId(msg, args);
      if (!target) return msg.reply("Usage: !pay @user <amount>");
      if (target === msg.sender) return msg.reply("You can't pay yourself.");

      const amountStr = args.split(" ").pop(); // Try to get the last part
      let amount = parseInt(amountStr?.replace(/,/g, "") || "0");

      // If parseId consumed the text, we might need a better arg parser or assume last arg
      // Re-check logic: parseId(msg, "100 @dani") -> returns dani.
      // We need to extract number specifically.
      // Simple regex for number:
      const match = args.match(/(\d+)/);
      if (match) amount = parseInt(match[0]);

      if (!amount || amount <= 0) return msg.reply("Invalid amount.");

      const ecoSender = await EconomyManager.get(msg.session, msg.sender);
      if (amount > ecoSender.balance)
        return msg.reply("You don't have enough money.");

      const tax = Math.floor(amount * TAX_RATE);
      const totalDeduction = amount; // Tax is deducted from the transferred amount or added? Usually deducted from receiver or validation.
      // Let's deduct tax from the amount sent. Receiver gets (Amount - Tax).
      const amountReceived = amount - tax;

      const ecoReceiver = await EconomyManager.get(msg.session, target);

      await EconomyManager.update(msg.session, msg.sender, {
        balance: BigInt(ecoSender.balance) - BigInt(amount),
      });

      await EconomyManager.update(msg.session, target, {
        balance: BigInt(ecoReceiver.balance) + BigInt(amountReceived),
      });

      return msg.client.sendMessage(msg.chat, {
        text: `💸 Transaction Successful!\n\nSent: ${formatMoney(amount)}\nTax (5%): ${formatMoney(tax)}\nReceived: ${formatMoney(amountReceived)}\n\nTo: ${parseUser(target)}`,
        mentions: [target],
      });
    },
  },
  {
    pattern: "daily",
    category: "economy",
    function: async (msg) => {
      const eco = await EconomyManager.get(msg.session, msg.sender);
      const now = new Date();
      const last = eco.lastDaily ? new Date(eco.lastDaily) : new Date(0);

      const diff = now - last;
      const cooldown = 24 * 60 * 60 * 1000;

      if (diff < cooldown) {
        const remaining = cooldown - diff;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (remaining % (1000 * 60 * 60)) / (1000 * 60),
        );
        return msg.reply(
          `🕒 You can claim your daily reward in ${hours}h ${minutes}m.`,
        );
      }

      const reward = 500; // Fixed or random? Let's do fixed 500

      await EconomyManager.update(msg.session, msg.sender, {
        balance: BigInt(eco.balance) + BigInt(reward),
        lastDaily: now,
      });

      return msg.reply(
        `💰 Check-in successful! You received ${formatMoney(reward)}.`,
      );
    },
  },
  {
    pattern: "work",
    category: "economy",
    function: async (msg) => {
      const eco = await EconomyManager.get(msg.session, msg.sender);
      const now = new Date();
      const last = eco.lastWork ? new Date(eco.lastWork) : new Date(0);

      const diff = now - last;
      const cooldown = 60 * 60 * 1000; // 1 Hour

      if (diff < cooldown) {
        const remaining = cooldown - diff;
        const minutes = Math.floor(remaining / (1000 * 60));
        return msg.reply(`You are tired. You can work again in ${minutes}m.`);
      }

      // Earn between 50 and 200
      const earned = Math.floor(Math.random() * 151) + 50;

      await EconomyManager.update(msg.session, msg.sender, {
        balance: BigInt(eco.balance) + BigInt(earned),
        lastWork: now,
      });

      const assignments = [
        "You fixed a bug.",
        "You walked a dog.",
        "You sold lemonade.",
        "You helped a grandma.",
        "You cleaned the house.",
      ];
      const job = assignments[Math.floor(Math.random() * assignments.length)];

      return msg.reply(`🔨 ${job} You earned ${formatMoney(earned)}.`);
    },
  },
  {
    pattern: "gamble",
    alias: ["bet", "dice"],
    category: "economy",
    function: async (msg, args) => {
      const amount = parseInt(args?.replace(/,/g, "") || "0");
      if (!amount || amount <= 0) return msg.reply("Usage: !gamble <amount>");

      const eco = await EconomyManager.get(msg.session, msg.sender);
      if (amount > eco.balance)
        return msg.reply("You don't have enough money.");

      const win = Math.random() > 0.5;

      if (win) {
        await EconomyManager.update(msg.session, msg.sender, {
          balance: BigInt(eco.balance) + BigInt(amount),
        });
        return msg.reply(
          `🎲 You won ${formatMoney(amount)}! Balance: ${formatMoney(BigInt(eco.balance) + BigInt(amount))}`,
        );
      } else {
        await EconomyManager.update(msg.session, msg.sender, {
          balance: BigInt(eco.balance) - BigInt(amount),
        });
        return msg.reply(
          `🎲 You lost ${formatMoney(amount)}. Balance: ${formatMoney(BigInt(eco.balance) - BigInt(amount))}`,
        );
      }
    },
  },
  {
    pattern: "rob",
    alias: ["steal"],
    category: "economy",
    function: async (msg, args) => {
      const target = await parseId(msg, args);
      const eco = await EconomyManager.get(msg.session, msg.sender);

      if (!target) return msg.reply("Usage: !rob @user");
      if (target === msg.sender)
        return msg.reply("You can't rob yourself (that's just spending).");

      // Cooldown 1h
      const now = new Date();
      const last = eco.lastRob ? new Date(eco.lastRob) : new Date(0);
      if (now - last < 3600000) {
        return msg.reply(
          "You are laying low from the police. Try again later.",
        );
      }

      const victim = await EconomyManager.get(msg.session, target);

      if (victim.balance < 100) return msg.reply("They are too poor to rob.");

      // 40% chance success
      const success = Math.random() < 0.4;

      if (success) {
        // Steal 10-50% of wallet
        const percent = Math.random() * 0.4 + 0.1;
        const stolen = Math.floor(Number(victim.balance) * percent);

        await EconomyManager.update(msg.session, msg.sender, {
          balance: BigInt(eco.balance) + BigInt(stolen),
          lastRob: now,
        });
        await EconomyManager.update(msg.session, target, {
          balance: BigInt(victim.balance) - BigInt(stolen),
        });
        return msg.client.sendMessage(msg.chat, {
          text: `🔫 You robbed ${formatMoney(stolen)} from ${parseUser(target)}!`,
          mentions: [target],
        });
      } else {
        // Fined 500 or 10%
        const fine = 500;
        await EconomyManager.update(msg.session, msg.sender, {
          balance: BigInt(eco.balance) - BigInt(fine),
          lastRob: now,
        });
        return msg.reply(
          `🚓 You got caught! You paid a fine of ${formatMoney(fine)}.`,
        );
      }
    },
  },
];
