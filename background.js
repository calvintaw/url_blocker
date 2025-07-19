chrome.runtime.onInstalled.addListener(() => {
	chrome.storage.local.set({ enabled: true, whitelist: [] });
});

importScripts("config.js");

async function checkUrlWithSafeBrowsing(url) {
	const response = await fetch(
		`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				client: {
					clientId: "smart-malicious-detector",
					clientVersion: "1.0",
				},
				threatInfo: {
					threatTypes: ["MALWARE", "SOCIAL_ENGINEERING"],
					platformTypes: ["ANY_PLATFORM"],
					threatEntryTypes: ["URL"],
					threatEntries: [{ url }],
				},
			}),
		}
	);

	const data = await response.json();
	if (data && data.matches) {
		console.log("⚠️ Unsafe URL Detected:", url);
		return true;
	}
	return false;
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url) {
		const isUnsafe = await checkUrlWithSafeBrowsing(tab.url);
		if (isUnsafe) {
			chrome.notifications.create({
				type: "basic",
				iconUrl: "icons/48.png",
				title: "Unsafe Site Detected",
				message: "This website may be harmful!",
			});

			chrome.tabs.update(tabId, {
				url: chrome.runtime.getURL("warning.html"),
			});
		}
	}
});
