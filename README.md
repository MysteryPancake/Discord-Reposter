# Discord Reposter
A simple bot I made because I wanted my friends to stop deleting their messages.

It reposts all the messages from one channel to another, which can even be in another server!

However, the bot needs to be in both servers for this to work.

## Commands
### Repost To
*Reposts to a channel.*

`/repost <CHANNEL>` or `/repost to <CHANNEL>`

### Repost From
*Reposts from a channel.*

`/repost from <CHANNEL>`

### Repost Webhook
*Reposts through a webhook.*

`/reposthook` or `/repostwebhook` instead of `/repost`

### Repost Live
*Reposts messages as they come.*

`/repostlive` or `/repostlivehook` instead of `/repost`

### Repost Stop
*Stops reposting.*

`/repost stop` or `/repost halt` or `/repost cease` or `/repost terminate` or `/repost suspend` or `/repost cancel` or `/repost die` or `/repost end`

### Repost Commands
*Posts the command list.*

`/repost help` or `/repost commands`

### Repost Replace
*Replaces text when reposting.*

`/repost replace <FIND> <REPLACE>`

### Repost Replacements
*Posts the replacement list.*

`/repost replacements`

### Repost Prefix
*Changes the bot prefix.*

`/repost prefix <PREFIX>`

### Repost Tags
*Toggles user tags when reposting.*

`/repost tags` or `/repost tags <STATE>`

### Repost Nicknames
*Toggles nicknames when reposting.*

`/repost nicknames` or `/repost nicknames <STATE>`

### Repost Pins
*Toggles pins when reposting.*

`/repost pins` or `/repost pins <STATE>`

## Setup
1. [Create your app with a Bot](https://discordapp.com/developers/applications/me).
2. Copy your bot's secret token and [paste it on this line](https://github.com/MysteryPancake/Discord-Reposter/blob/master/reposter.js#L9).
3. Go to `https://discordapp.com/oauth2/authorize?client_id=<CLIENT_ID>&scope=bot`, with `<CLIENT_ID>` as your app's client ID.
4. [Install Node.js](https://nodejs.org/en/download): `brew install node`
5. [Install the dependencies](https://github.com/MysteryPancake/Discord-Reposter/blob/master/package.json#L36-L38): `npm install`
6. [Run the bot](https://github.com/MysteryPancake/Discord-Reposter/blob/master/reposter.js): `npm start`
7. Hope it works!

![Icon](repost.png?raw=true)
