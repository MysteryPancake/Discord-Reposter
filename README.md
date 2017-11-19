# Discord Reposter
A simple bot I made because I wanted my friends to stop deleting their messages.

It reposts all the messages from one channel to another channel, which can even be in another server.

It reposts backward from the newest message. Currently it's impossible to go forward from the oldest message because [discord.js](https://github.com/hydrabolt/discord.js) doesn't have a method to get the oldest message in a channel.

## Usage
1. [Create your app](https://discordapp.com/developers/applications/me)
2. Click `Create a Bot User`
3. Copy your bot's secret token and [paste it on this line](https://github.com/MysteryPancake/Discord-Reposter/blob/master/bot.js#L8)
4. Go to `https://discordapp.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot`, with `<CLIENT_ID>` as your app's client ID
5. [Install node.js](https://nodejs.org/en/download)
6. [Install discord.js](https://github.com/hydrabolt/discord.js): `npm install discord.js`
7. [Run the bot](https://github.com/MysteryPancake/Discord-Reposter/blob/master/bot.js): `node bot.js`
8. [On the Discord website](https://discordapp.com/channels/@me), find the channel you want to repost from, and copy the last number on the URL
9. Find the channel you want to repost to, and in that channel say `/repost <CHANNEL_ID>`, with `<CHANNEL_ID>` as the number you copied
10. Hope it works

![Icon](repost.png?raw=true)
