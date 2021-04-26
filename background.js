browser.runtime.onInstalled.addListener((e) => {
    if(e.reason !== "install") return;
    browser.tabs.create({
        url: "https://oceaann.github.io/gotochannel"
    });
});

browser.browserAction.onClicked.addListener(() => {
    browser.tabs.create({
        url: "https://oceaann.github.io/gotochannel"
    });
});