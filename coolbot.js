"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setGame("on " + client.guilds.size + " servers").catch(console.log);
	console.log("READY FOR ACTION!");
});

let lastMessage;
let webhooks = {};

function fetchMessages(message, channel) {
	message.channel.fetchMessages({ limit: 100, before: message.id }).then(function(messages) {
		messages.forEach(function(value) {
			const sender = webhooks[value.author.username] || channel;
			const content = value.content;
			if (content) {
				sender.send(content).then(function(sent) {
					value.reactions.forEach(function(reaction) {
						sent.react(reaction.emoji).catch(console.log);
					});
				}).catch(console.log);
			}
			value.attachments.forEach(function(file) {
				sender.send(file.url).then(function(sent) {
					value.reactions.forEach(function(reaction) {
						sent.react(reaction.emoji).catch(console.log);
					});
				}).catch(console.log);
			});
			lastMessage = value;
		});
		fetchMessages(lastMessage, channel);
	}).catch(console.log);
}

client.on("message", function(message) {
	if (message.author.bot) return;
	if (message.content.startsWith("/repost")) {
		const id = message.content.substr(8);
		const channel = client.channels.get(id);
		if (channel) {
			message.channel.send("Reposting to " + id + "!").catch(console.log);
			channel.send(message.guild.iconURL).catch(console.log);
			channel.send("__**" + message.guild.name + "**__").catch(console.log);
			channel.send("**" + message.channel.name + "**").catch(console.log);
			channel.send("*" + (message.channel.topic || "No topic") + "*").catch(console.log);
			let promises = [];
			message.channel.members.forEach(function(member) {
				if (!member.user.bot) {
					const username = member.user.username;
					promises.push(channel.createWebhook(username, member.user.avatarURL).then(function(hook) {
						webhooks[username] = hook;
					}).catch(console.log));
				}
			});
			Promise.all(promises).then(function() {
				fetchMessages(message, channel);
			});
		} else {
			message.channel.send("Couldn't repost to " + id + "!").catch(console.log);
		}
	}
});
