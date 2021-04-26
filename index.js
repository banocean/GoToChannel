const main = () => {

   let mappedChannelIds = []

   const originalRequestOpen = XMLHttpRequest.prototype.open;
   const originalFetch = window.fetch;

   const extractCommentActionChannelId = (action) => {

      if (action.replayChatItemAction) {
         action.replayChatItemAction.actions.forEach(extractCommentActionChannelId);
         return;
      }

      if(!action.addChatItemAction) return;

      const messageItem = action.addChatItemAction.item.liveChatTextMessageRenderer;
      if(!messageItem || !messageItem.authorExternalChannelId) return;

      if(mappedChannelIds.length > 300) mappedChannelIds.shift();

      mappedChannelIds.push({
         channelId: messageItem.authorExternalChannelId,
         commentId: messageItem.id,
         contextMenuEndpointParams: messageItem.contextMenuEndpoint.liveChatItemContextMenuEndpoint.params
      });

   }

   const getAuthorsChannelIds = (d) => {
      const availableCommentActions = d.continuationContents ? d.continuationContents.liveChatContinuation.actions : d.contents.liveChatRenderer.actions;
      if(!availableCommentActions || !Array.isArray(availableCommentActions)) return;
      return availableCommentActions;
   }

   const itemStructures = (url, text, icon) => {
      return {
         "menuNavigationItemRenderer": {
            "text": {
               "runs": [ { "text": text } ]
            },
            "icon": { "iconType": icon },
            "navigationEndpoint":{ "urlEndpoint": { "url": url, "target": "TARGET_NEW_WINDOW" } }
         }
      }
   }

   const appendAdditionalChannelContextItems = (url, response) => {

       const urlParams = new URLSearchParams(new URL(url).search);
       const params = urlParams.get("params");
       const mappedChannel = mappedChannelIds.find(x => x.contextMenuEndpointParams === params);

       if(!mappedChannel) return response;

       const responseData = JSON.parse(response);

       const mainMenuRendererNode = (responseData.response ? responseData.response : responseData).liveChatItemContextMenuSupportedRenderers;

       mainMenuRendererNode.menuRenderer.items.push(itemStructures(`/channel/${mappedChannel.channelId}`, "Visit Channel", "ACCOUNT_BOX"));

       response = JSON.stringify(responseData);

       return response;
   }

   const callback = (url, response) => {

      try {

         if(url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat") || url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_live_chat_replay")) {
            const ChannelIDs = getAuthorsChannelIds(JSON.parse(response));
            ChannelIDs.forEach(extractCommentActionChannelId);
         }

          if(url.startsWith("https://www.youtube.com/youtubei/v1/live_chat/get_item_context_menu")) return appendAdditionalChannelContextItems(url, response);

      } catch(err) {
         console.log(err)
      }

      return response;

   }

   XMLHttpRequest.prototype.open = function() {
      this.addEventListener("readystatechange", function(event) {

          if (this.readyState === 4) {

              const response = callback(this.responseURL, event.target.responseText);

              // re-define response content properties and remove "read-only" flags
              Object.defineProperty(this, "response", { writable: true });
              Object.defineProperty(this, "responseText", { writable: true });

              this.response = response;
              this.responseText = response;
          }
      });

      return originalRequestOpen.apply(this, arguments);
  };

  window.fetch = (...args) => (async(args) => {
      var result = await originalFetch(...args);
      var json = await result.json();

      if(json === null) return result;

      var responseText = JSON.stringify(json);
      var responseTextModified = callback(result.url, responseText);

      result.json = function() {
          return new Promise(function(resolve, reject) {
              resolve(JSON.parse(responseTextModified));
          })
      };

      result.text = function() {
          return new Promise(function(resolve, reject) {
              resolve(responseTextModified);
          })
      };

      return result;
  })(args);

   const scripts = document.getElementsByTagName("script");
   for (var script of scripts) {
       if(script.text.indexOf("window[\"ytInitialData\"]") >= 0) {
           window.eval(script.text.replace("ytInitialData", "ytInitialData_original"));
       }
   }

   if(window.ytInitialData_original) getAuthorsChannelIds(window.ytInitialData_original);

}

const retrieveChatFrameWindow = () => {

   // Get chat iframe -Firefox 

   for (let i = 0; i < window.frames.length; i++) {
       try {
           if(window.frames[i].location) {
               const pathname = window.frames[i].location.pathname;
               if(pathname === "/live_chat" || pathname === "/live_chat_replay") return frames[i];
           }
       } catch(ex) { }
   }
}

const tryBrowserIndependentExecution = () => {

   const destinationFrameWindow = retrieveChatFrameWindow();

   if(!destinationFrameWindow || !destinationFrameWindow.document || destinationFrameWindow.document.readyState != "complete") {
       setTimeout(tryBrowserIndependentExecution, 1000);
       return;
   }

   if(destinationFrameWindow.channelResolverInitialized) return;

   // Firefox sometimes block executing code on iframe (eval fix it)

   destinationFrameWindow.eval("("+ main.toString() +")();");

   destinationFrameWindow.channelResolverInitialized = true;
}

tryBrowserIndependentExecution();