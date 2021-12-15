const configs = {
    menuItems: [[(ch) => `/channel/${ch.channelId}`, "Visit Channel", "ACCOUNT_BOX"]],
    messages_limit: 500
};

const originalFetch = window.fetch;

const channels = [];

const commentActionExtract = (a) => {

    if (a.replayChatItemAction) {
        return a.replayChatItemAction.actions.forEach(commentActionExtract);
    };

    if(!a.addChatItemAction) return;

    const item = a.addChatItemAction.item.liveChatTextMessageRenderer;
    if(!item || !item.authorExternalChannelId) return;

    if(channels.length > configs.messages_limit) channels.shift();

    channels.push({
        channelId: item.authorExternalChannelId,
        commentId: item.id,
        contextMenuEndpointParams: item.contextMenuEndpoint.liveChatItemContextMenuEndpoint.params
    });

};

const callback = async (e) => {

    const response = await e.json()
    const textReturn = JSON.stringify(response)
    
    if(e.url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat") || e.url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat_replay")) {

        const channelIDs = response.continuationContents ? response.continuationContents.liveChatContinuation.actions : response.contents.liveChatRenderer.actions;
        if(!channelIDs) return textReturn;
        channelIDs.forEach(commentActionExtract);

    };

    if(e.url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_item_context_menu")) {

        if(response === null) return textReturn;

        const urlParams = new URLSearchParams(new URL(e.url).search);
        const params = urlParams.get("params");
        const mappedChannel = channels.find(x => x.contextMenuEndpointParams === params);

        if(!mappedChannel) return textReturn;

        const mainMenuRendererNode = (response.response ? response.response : response).liveChatItemContextMenuSupportedRenderers;
        
        configs.menuItems.forEach((item) => {

            mainMenuRendererNode.menuRenderer.items.push({
                "menuNavigationItemRenderer": {
                    "text": {
                        "runs": [ { "text": item[1] } ]
                    },
                    "icon": { "iconType": item[2] },
                    "navigationEndpoint":{ "urlEndpoint": { "url": item[0](mappedChannel), "target": "TARGET_NEW_WINDOW" } }
                }
            });

        });

        const newResponse = JSON.stringify(response);

        return newResponse;

    };

    return textReturn;
};

window.fetch = async (...args) => {

    const result = await originalFetch(...args);
    
    try {
        const response = await callback(result);
        result.json = function() {
            return new Promise(function(resolve, reject) {
                resolve(JSON.parse(response));
            });
        };
    
        result.text = function() {
            return new Promise(function(resolve, reject) {
                resolve(response);
            });
        };
    
        return result;

    } catch(e) {

        return console.log(e);

    };
};
