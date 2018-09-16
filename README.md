# Discord Reposter
A simple bot I made because I wanted my friends to stop deleting their messages.

It reposts all the messages from one channel to another, which can even be in another server!

However, the bot needs to be in both servers for this to work.

## Commands
### Repost To
*Reposts to a channel.*

`/repost to <CHANNEL>` or `/repost <CHANNEL>`

### Repost From
*Reposts from a channel.*

`/repost from <CHANNEL>`

### Repost Webhook
*Reposts through a webhook.*

`/repostwebhook` or `/reposthook` instead of `/repost`

### Repost Commands
*Posts the command list.*

`/repost commands` or `/repost help`

### Repost Replace
*Replaces text when reposting.*

`/repost replace <FIND> <REPLACE>`

### Repost Replacements
*Posts the replacement list.*

`/repost replacements`

## Setup
1. [Create your app](https://discordapp.com/developers/applications/me).
2. Click `Create a Bot User`.
3. Copy your bot's secret token and [paste it on this line](https://github.com/MysteryPancake/Discord-Reposter/blob/master/reposter.js#L8).
4. Go to `https://discordapp.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot`, with `<CLIENT_ID>` as your app's client ID.
5. [Install node.js](https://nodejs.org/en/download): `brew install node`
6. [Install discord.js](https://github.com/hydrabolt/discord.js): `npm install discord.js`
7. [Run the bot](https://github.com/MysteryPancake/Discord-Reposter/blob/master/reposter.js): `npm start`
8. Find the channel you want to repost from, and in that channel say `/repost to <CHANNEL>`, with `<CHANNEL>` as the channel you want to repost to.
9. Hope it works!

![Icon](repost.png?raw=true)
