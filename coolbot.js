"use strict";

console.log("LOADING LIBRARIES...");

const Discord = require("discord.js");
const client = new Discord.Client();

client.login("<SECRET_BOT_TOKEN>");

client.on("ready", function() {
	client.user.setActivity("on " + client.guilds.size + " servers").catch(console.error);
	console.log("READY FOR ACTION!");
});

let lastMessage;
const webhooks = {};

function fetchMessages(message, channel) {
	message.channel.fetchMessages({ limit: 100, before: message.id }).then(function(messages) {
		messages.forEach(function(value) {
			const sender = webhooks[value.author.username] || channel;
			const content = value.content;
			if (content) {
				sender.send(content).then(function(sent) {
					value.reactions.forEach(function(reaction) {
						sent.react(reaction.emoji).catch(console.error);
					});
				}).catch(console.error);
			}
			value.attachments.forEach(function(file) {
				sender.send(file.url).then(function(sent) {
					value.reactions.forEach(function(reaction) {
						sent.react(reaction.emoji).catch(console.error);
					});
				}).catch(console.error);
			});
			lastMessage = value;
		});
		fetchMessages(lastMessage, channel);
	}).catch(console.error);
}

client.on("message", function(message) {
	if (message.author.bot) return;
	if (message.content.startsWith("/repost")) {
		const id = message.content.substr(8);
		const channel = client.channels.get(id);
		if (channel) {
			message.channel.send("Reposting to " + id + "!").catch(console.error);
			channel.send(message.guild.iconURL).catch(console.error);
			channel.send("__**" + message.guild.name + "**__").catch(console.error);
			channel.send("**" + message.channel.name + "**").catch(console.error);
			channel.send("*" + (message.channel.topic || "No topic") + "*").catch(console.error);
			const promises = [];
			message.channel.members.forEach(function(member) {
				if (!member.user.bot) {
					const username = member.user.username;
					promises.push(channel.createWebhook(username, member.user.displayAvatarURL).then(function(hook) {
						webhooks[username] = hook;
					}).catch(console.error));
				}
			});
			Promise.all(promises).then(function() {
				fetchMessages(message, channel);
			});
		} else {
			message.channel.send("Couldn't repost to " + id + "!").catch(console.error);
		}
	}
});