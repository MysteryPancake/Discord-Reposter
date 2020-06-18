"use strict";

console.log("LOADING LIBRARIES...");

const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>").catch(console.error);

client.on("ready", function() {
	client.user.setActivity(client.guilds.size + " server" + (client.guilds.size === 1 ? "" : "s"), { type: "WATCHING" }).catch(console.error);
	console.log("READY FOR ACTION!");
});

let config = {
	replacements: {},
	nicknames: {},
	prefixes: {},
	active: {},
	tags: {},
	pins: {},
	live: {}
};

function updateJson() {
	fs.writeFileSync("config.json", JSON.stringify(config, undefined, "\t"));
}

if (fs.existsSync("config.json")) {
	config = JSON.parse(fs.readFileSync("config.json", "utf8"));
} else {
	updateJson();
}

function updateStatus() {
	const size = Object.keys(config.active).length;
	client.user.setActivity(size + " repost" + (size === 1 ? "" : "s"), { type: "WATCHING" }).catch(console.error);
}

function capitalizeFirst(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

function inactive(to, from) {
	return from ? !config.active[from] : !config.active[to];
}

function replaceAll(channel, str) {
	const replace = config.replacements[(channel.guild || channel).id];
	if (replace) {
		let replaced = str;
		for (let find in replace) {
			const regex = new RegExp(find, "g");
			replaced = replaced.replace(regex, replace[find]);
		}
		return replaced;
	} else {
		return str;
	}
}

async function send(channel, content, reactions) {
	const channelID = channel.channelID || channel.id;
	if (inactive(channelID)) return;
	const sent = await channel.send(content).catch(console.error);
	if (reactions.size) {
		for (const reaction of reactions.values()) {
			if (inactive(channelID)) break;
			const emoji = reaction.emoji;
			if (client.emojis.has(emoji.id) || emoji.id === null) {
				await sent.react(emoji).catch(console.error);
			}
		}
	}
}

function richEmbed(embed, channel) {
	const rich = new Discord.RichEmbed();
	if (embed.author) {
		rich.setAuthor(replaceAll(channel, embed.author.name), embed.author.iconURL, embed.author.url);
	}
	rich.setColor(embed.color);
	if (embed.description) {
		rich.setDescription(replaceAll(channel, embed.description));
	}
	for (let i = 0; i < embed.fields.length; i++) {
		const field = embed.fields[i];
		rich.addField(replaceAll(channel, field.name), replaceAll(channel, field.value), field.inline);
	}
	if (embed.footer) {
		rich.setFooter(replaceAll(channel, embed.footer.text), embed.footer.iconURL);
	}
	if (embed.image) {
		rich.setImage(embed.image.url);
	}
	if (embed.thumbnail) {
		rich.setThumbnail(embed.thumbnail.url);
	}
	rich.setTimestamp(embed.timestamp);
	if (embed.title) {
		rich.setTitle(replaceAll(channel, embed.title));
	}
	rich.setURL(embed.url);
	return rich;
}

function setBoolean(channel, key, value) {
	const guild = (channel.guild || channel).id;
	const enabled = config[key][guild];
	const property = capitalizeFirst(key);
	if (value.match(/1|true|yes|confirm|agree|enable|on|positive|accept|ye|yep|ya|yah|yeah|sure|ok|okay/)) {
		config[key][guild] = true;
		channel.send("✅ **" + property + " on!**").catch(console.error);
	} else if (value.match(/0|false|no|deny|denied|disagree|disable|off|negative|-1|nah|na|nope|stop|end|cease/)) {
		config[key][guild] = false;
		channel.send("❌ **" + property + " off!**").catch(console.error);
	} else {
		config[key][guild] = !enabled;
		channel.send((enabled ? "❌" : "✅") + " **" + property + " toggled " + (enabled ? "off" : "on") + "!**").catch(console.error);
	}
	updateJson();
}

function niceName(to, from, user) {
	const guild = (to.guild || to).id;
	if (config.nicknames[guild] && from.guild) {
		const member = from.guild.member(user);
		if (member) {
			return member.displayName;
		} else if (config.tags[guild]) {
			return user.tag;
		} else {
			user.username;
		}
	} else if (config.tags[guild]) {
		return user.tag;
	} else {
		return user.username;
	}
}

function setPrefix(channel, prefix) {
	const guild = (channel.guild || channel).id;
	const previous = config.prefixes[guild] || "/";
	if (prefix) {
		config.prefixes[guild] = prefix;
		channel.send("**Changed prefix from `" + previous + "` to `" + prefix + "`!**").catch(console.error);
		updateJson();
	} else {
		channel.send("**Missing `prefix` argument! `" + previous + "repost prefix <PREFIX>`**").catch(console.error);
	}
}

function setReplacement(channel, find, replace) {
	const guild = (channel.guild || channel).id;
	const prefix = config.prefixes[guild] || "/";
	config.replacements[guild] = config.replacements[guild] || {};
	if (find && replace) {
		config.replacements[guild][find] = replace;
		channel.send("**Replacing `" + find + "` with `" + replace + "`!**").catch(console.error);
		updateJson();
	} else if (find) {
		const replacement = config.replacements[guild][find];
		if (replacement) {
			channel.send("**`" + find + "` is replaced with `" + replacement + "`**").catch(console.error);
		} else {
			channel.send("**Missing `replace` argument! `" + prefix + "repost replace " + find + " <REPLACE>`**").catch(console.error);
		}
	} else {
		channel.send("**Missing `find` and `replace` arguments! `" + prefix + "repost replace <FIND> <REPLACE>`**").catch(console.error);
	}
}

async function awaitReaction(message, author, emoji, func) {
	await message.react(emoji).catch(console.error);
	const collector = message.createReactionCollector(function(reaction, user) {
		return user.id === author && reaction.emoji.name === emoji;
	}, { max: 1 });
	collector.on("collect", function() {
		collector.stop();
		func();
	});
}

async function sendReplacements(channel, id) {
	const replace = config.replacements[(channel.guild || channel).id];
	if (replace) {
		const size = Object.keys(replace).length;
		const count = await channel.send("**This channel has " + size + " replacement" + (size === 1 ? "" : "s") + "!**").catch(console.error);
		for (let find in replace) {
			const message = await channel.send("`" + find + "` is replaced with `" + replace[find] + "`").catch(console.error);
			awaitReaction(message, id, "❌", function() {
				delete replace[find];
				message.delete().catch(console.error);
				updateJson();
				const newSize = Object.keys(replace).length;
				count.edit("**This channel has " + newSize + " replacement" + (newSize === 1 ? "" : "s") + "!**").catch(console.error);
			});
		}
	} else {
		channel.send("**This channel has no replacements!**").catch(console.error);
	}
}

const systemMessages = {
	RECIPIENT_ADD: " added someone to the group.",
	RECIPIENT_REMOVE: " removed someone from the group.",
	CALL: " started a call.",
	CHANNEL_NAME_CHANGE: " changed the name of this channel.",
	CHANNEL_ICON_CHANGE: " changed the icon of this channel.",
	PINS_ADD: " pinned a message to this channel.",
	GUILD_MEMBER_JOIN: " just joined."
};

async function sendMessage(message, channel, webhook, author) {
	if (inactive(channel.id, message.channel.id)) return;
	if (message.type !== "DEFAULT") {
		await channel.send("**" + replaceAll(channel, niceName(channel, message.channel, message.author)) + systemMessages[message.type] + "**").catch(console.error);
	} else if (message.author.id !== author) {
		if (webhook) {
			await webhook.edit(replaceAll(channel, niceName(channel, message.channel, message.author)), message.author.displayAvatarURL).catch(console.error);
		} else {
			await channel.send("**" + replaceAll(channel, niceName(channel, message.channel, message.author)) + "**").catch(console.error);
		}
	}
	if (message.content) {
		await send(webhook ? webhook : channel, replaceAll(channel, message.content), message.reactions);
	}
	if (message.attachments.size) {
		for (const attachment of message.attachments.values()) {
			await send(webhook ? webhook : channel, attachment.filesize > 8000000 ? attachment.url : { files: [attachment.url] }, message.reactions);
		}
	}
	if (message.embeds.length) {
		for (let i = 0; i < message.embeds.length; i++) {
			const embed = message.embeds[i];
			if (embed.type === "rich") {
				await send(webhook ? webhook : channel, richEmbed(embed, channel), message.reactions);
			}
		}
	}
}

async function sendMessages(messages, channel, webhook, author) {
	if (inactive(channel.id)) return;
	let last;
	if (messages && messages.size) {
		const backward = messages.array().reverse();
		for (let i = 0; i < backward.length; i++) {
			if (inactive(channel.id, backward[i].channel.id)) break;
			await sendMessage(backward[i], channel, webhook, last ? last.author.id : author);
			last = backward[i];
		}
	}
}

async function fetchMessages(message, channel, webhook, author) {
	if (inactive(channel.id, message.channel.id)) return;
	const messages = await message.channel.fetchMessages({ limit: 100, after: message.id }).catch(async function() {
		await channel.send("**Couldn't fetch messages!**").catch(console.error);
	});
	if (inactive(channel.id, message.channel.id)) return;
	if (messages && messages.size) {
		await sendMessages(messages, channel, webhook, author);
		const last = messages.last();
		await fetchMessages(last, channel, webhook, last.author.id);
	} else {
		await channel.send("**Repost Complete!**").catch(console.error);
	}
}

async function fetchWebhook(channel) {
	const webhooks = await channel.fetchWebhooks().catch(async function() {
		await channel.send("**Can't read webhooks!**").catch(console.error);
	});
	if (webhooks) {
		for (const webhook of webhooks.values()) {
			if (webhook.owner.id === client.user.id) {
				return webhook;
			}
		}
		return channel.createWebhook("Reposter", client.user.displayAvatarURL).catch(console.error);
	}
}

async function sendInfo(to, from) {
	const rich = new Discord.RichEmbed();
	rich.setTitle(from.name || from.id);
	rich.setDescription(from.topic || "No topic");
	rich.setFooter("Reposting from " + from.id, client.user.displayAvatarURL);
	if (from.guild) {
		rich.setAuthor(from.guild.name, from.guild.iconURL);
		rich.setThumbnail(from.guild.iconURL);
	} else if (from.recipient) {
		rich.setAuthor(niceName(to, from, from.recipient), from.recipient.displayAvatarURL);
		rich.setThumbnail(from.recipient.displayAvatarURL);
	} else {
		rich.setAuthor(niceName(to, from, from.owner), from.iconURL);
		rich.setThumbnail(from.iconURL);
	}
	rich.setTimestamp();
	if (from.parent) {
		rich.addField("Channel Category", from.parent.name, true);
	}
	rich.addField("NSFW Channel", from.nsfw || "false", true);
	rich.addField("Channel ID", from.id, true);
	rich.addField("Channel Type", from.type, true);
	rich.addField("Channel Creation Date", from.createdAt, true);
	rich.addField("Channel Creation Time", from.createdTimestamp, true);
	if (from.guild) {
		rich.addField("Server ID", from.guild.id, true);
		rich.addField("Server Owner", niceName(to, from, from.guild.owner.user), true);
		rich.addField("Server Region", from.guild.region, true);
		const channels = new Map();
		for (const channel of from.guild.channels.values()) {
			channels.set(channel.type, (channels.get(channel.type) || 0) + 1);
		}
		for (const channel of channels.entries()) {
			rich.addField(capitalizeFirst(channel[0]) + " Channels", channel[1], true);
		}
		let bots = 0;
		for (const member of from.guild.members.values()) {
			if (member.user.bot) {
				bots++;
			}
		}
		rich.addField("Server Humans", from.guild.members.size - bots, true);
		rich.addField("Server Bots", bots, true);
		rich.addField("Server Roles", from.guild.roles.size, true);
		rich.addField("Server Emojis", from.guild.emojis.size, true);
		rich.addField("Server Verification", from.guild.verificationLevel, true);
		rich.addField("Default Role", from.guild.defaultRole.name, true);
		rich.addField("Default Role ID", from.guild.defaultRole.id, true);
		if (from.guild.systemChannel) {
			rich.addField("Default Channel", from.guild.systemChannel.name, true);
			rich.addField("Default Channel ID", from.guild.systemChannelID, true);
		}
		rich.addField("Server Creation Date", from.guild.createdAt, true);
		rich.addField("Server Creation Time", from.guild.createdTimestamp, true);
	} else if (from.recipients) {
		rich.addField("Channel Owner", niceName(to, from, from.owner), true);
		rich.addField("Channel Members", from.recipients.size, true);
	}
	await to.send(rich).catch(console.error);
}

async function repost(id, message, webhook, direction, live) {
	const channel = (id && id.id) ? id : client.channels.get(id);
	const dir = direction ? "from" : "to";
	if (!channel) {
		const guild = client.guilds.get(id);
		if (guild) {
			config.active[message.channel.id] = true;
			updateStatus();
			await message.channel.send("**Reposting" + (live ? " live " : " ") + dir + " `" + (guild.name || id) + "`!**").catch(console.error);
			for (const match of guild.channels.values()) {
				if (inactive(message.channel.id)) break;
				config.active[match.id] = true;
				updateStatus();
				updateJson();
				await repost(match, message, webhook, direction, live);
			}
		} else if (message.mentions.channels.size) {
			await repost(message.mentions.channels.first(), message, webhook, direction, live);
		} else {
			const matches = [];
			for (const match of client.channels.values()) {
				if (id === match.name) {
					matches.push(match);
				}
			}
			if (matches.length) {
				if (matches.length === 1) {
					await repost(matches[0], message, webhook, direction, live);
				} else {
					await message.channel.send("**Found " + matches.length + " channels!**").catch(console.error);
					for (let i = 0; i < matches.length; i++) {
						const match = matches[i];
						const rich = new Discord.RichEmbed();
						rich.setFooter(capitalizeFirst(match.type) + " Channel", client.user.displayAvatarURL);
						if (match.guild) {
							rich.setAuthor(match.name, match.guild.iconURL);
						} else if (match.recipient) {
							rich.setAuthor(niceName(message.channel, match, match.recipient), match.recipient.displayAvatarURL);
						} else {
							rich.setAuthor(match.name, match.iconURL);
						}
						rich.setTimestamp(match.createdAt);
						rich.addField("Channel ID", "`" + match.id + "`", false);
						const embed = await message.channel.send(rich).catch(console.error);
						awaitReaction(embed, message.author.id, "✅", async function() {
							await repost(match, message, webhook, direction, live);
						});
					}
				}
			} else {
				await message.channel.send("**Couldn't repost " + dir + " `" + id + "`!**").catch(console.error);
			}
		}
	} else if (channel.id === message.channel.id) {
		await message.channel.send("**Can't repost " + dir + " the same channel!**").catch(console.error);
	} else if (!channel.type.match(/text|group|dm/)) {
		await message.channel.send("**Can't repost " + dir + " " + channel.type + " channels!**").catch(console.error);
	} else if (webhook && (direction ? message.channel.type : channel.type) === "dm") {
		await message.channel.send("**Can't create webhooks on DM channels!**").catch(console.error);
	} else if (channel.type === "text" && !direction && !channel.permissionsFor(client.user).has("SEND_MESSAGES")) {
		await message.channel.send("**Can't repost to `" + (channel.name || id) + "` without permission!**").catch(console.error);
	} else {
		const to = direction ? message.channel : channel;
		const from = direction ? channel : message.channel;
		config.active[to.id] = true;
		config.active[from.id] = true;
		updateStatus();
		updateJson();
		await message.channel.send("**Reposting" + (live ? " live " : " ") + dir + " `" + (channel.name || id) + "`!**").catch(console.error);
		if (live) {
			config.live[from.id] = { channel: to.id, hook: webhook };
			updateJson();
		} else {
			await sendInfo(to, from);
			if (inactive(to.id, from.id)) return;
			const hook = webhook && await fetchWebhook(to);
			if (config.pins[(to.guild || to).id]) {
				await to.send("__**Pins**__").catch(console.error);
				const pins = await from.fetchPinnedMessages().catch(async function() {
					await to.send("**Can't read pins!**").catch(console.error);
				});
				await sendMessages(pins, to, hook);
			}
			if (inactive(to.id, from.id)) return;
			await to.send("__**Messages**__").catch(console.error);
			const messages = await from.fetchMessages({ limit: 1, after: "0" }).catch(async function() {
				await to.send("**Can't read messages!**").catch(console.error);
			});
			const first = messages && messages.first();
			if (first) {
				await sendMessage(first, to, hook);
				await fetchMessages(first, to, hook, first.author.id);
			} else {
				await to.send("**Repost Complete!**").catch(console.error);
			}
		}
	}
}

async function repostLive(message) {
	const live = config.live[message.channel.id];
	if (live) {
		const channel = client.channels.get(live.channel);
		const hook = live.hook && await fetchWebhook(channel);
		await sendMessage(message, channel, hook);
	}
}

function sendCommands(channel) {
	const prefix = config.prefixes[(channel.guild || channel).id] || "/";
	const rich = new Discord.RichEmbed();
	rich.setTitle("Reposter Commands");
	rich.setDescription("By MysteryPancake");
	rich.setFooter(client.user.id, client.user.displayAvatarURL);
	rich.setAuthor(niceName(channel, channel, client.user), client.user.displayAvatarURL, "https://github.com/MysteryPancake/Discord-Reposter");
	rich.setThumbnail(client.user.displayAvatarURL);
	rich.setTimestamp();
	rich.setURL("https://github.com/MysteryPancake/Discord-Reposter#commands");
	rich.addField("Repost To", "*Reposts to a channel.*```" + prefix + "repost <CHANNEL>\n" + prefix + "repost to <CHANNEL>```", false);
	rich.addField("Repost From", "*Reposts from a channel.*```" + prefix + "repost from <CHANNEL>```", false);
	rich.addField("Repost Webhook", "*Reposts through a webhook.*```" + prefix + "reposthook\n" + prefix + "repostwebhook```Instead of:```" + prefix + "repost```", false);
	rich.addField("Repost Live", "*Reposts messages as they come.*```" + prefix + "repostlive\n" + prefix + "repostlivehook```Instead of:```" + prefix + "repost```", false);
	rich.addField("Repost Stop", "*Stops reposting.*```" + prefix + "repost stop\n" + prefix + "repost halt\n" + prefix + "repost cease\n" + prefix + "repost terminate\n" + prefix + "repost suspend\n" + prefix + "repost cancel\n" + prefix + "repost die\n" + prefix + "repost end```", false);
	rich.addField("Repost Commands", "*Posts the command list.*```" + prefix + "repost help\n" + prefix + "repost commands```", false);
	rich.addField("Repost Replace", "*Replaces text when reposting.*```" + prefix + "repost replace <FIND> <REPLACE>```", false);
	rich.addField("Repost Replacements", "*Posts the replacement list.*```" + prefix + "repost replacements```", false);
	rich.addField("Repost Prefix", "*Changes the bot prefix.*```" + prefix + "repost prefix <PREFIX>```", false);
	rich.addField("Repost Tags", "*Toggles user tags when reposting.*```" + prefix + "repost tags\n" + prefix + "repost tags <STATE>```", false);
	rich.addField("Repost Nicknames", "*Toggles nicknames when reposting.*```" + prefix + "repost nicknames\n" + prefix + "repost nicknames <STATE>```", false);
	rich.addField("Repost Pins", "*Toggles pins when reposting.*```" + prefix + "repost pins\n" + prefix + "repost pins <STATE>```", false);
	rich.addField("Channel ID", "```" + channel.id + "```", false);
	channel.send(rich).catch(console.error);
}

client.on("message", function(message) {
	repostLive(message);
	if (message.author.bot) return;
	const args = message.content.toLowerCase().split(" ");
	const prefix = config.prefixes[(message.guild || message.channel).id] || "/";
	if (args[0].startsWith(prefix + "repost")) {
		switch (args[1]) {
		case undefined:
		case "help":
		case "commands": {
			sendCommands(message.channel);
			break;
		}
		case "replacements": {
			sendReplacements(message.channel, message.author.id);
			break;
		}
		case "replace": {
			setReplacement(message.channel, args[2], args[3]);
			break;
		}
		case "prefix": {
			setPrefix(message.channel, args[2]);
			break;
		}
		case "tags":
		case "nicknames":
		case "pins": {
			setBoolean(message.channel, args[1], args[2]);
			break;
		}
		case "stop":
		case "halt":
		case "cease":
		case "terminate":
		case "suspend":
		case "cancel":
		case "die":
		case "end": {
			delete config.active[message.channel.id];
			delete config.live[message.channel.id];
			updateStatus();
			updateJson();
			message.channel.send("**Reposting Terminated!**").catch(console.error);
			break;
		}
		default: {
			const last = args[2];
			if (last) {
				repost(last, message, args[0].indexOf("hook") !== -1, args[1] === "from", args[0].indexOf("live") !== -1);
			} else {
				repost(args[1], message, args[0].indexOf("hook") !== -1, false, args[0].indexOf("live") !== -1);
			}
			break;
		}
		}
	}
});