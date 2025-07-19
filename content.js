function getHostname(url) {
	try {
		return new URL(url).hostname;
	} catch (e) {
		return null;
	}
}

function isDomainMatch(pattern, hostname) {
   try {
      // this is chatgpt generated. i didn't bother to check
		const escaped = pattern.replace(/[-[.\]/{}()+^$|\\]/g, "\\$&");
		const regexStr = escaped.replace(/\*/g, ".*").replace(/\?/g, ".");
		const regex = new RegExp(`^${regexStr}$`, "i");
		console.log("Matching hostname:", hostname, "with pattern:", pattern, "=>", isDomainMatch(pattern, hostname));
		return regex.test(hostname);
	} catch (e) {
		console.error("Invalid regex pattern:", pattern, e);
		return false;
	}
}

chrome.storage.local.get(["enabled", "whitelist", "redirectRules"], (data) => {
	const enabled = data.enabled ?? true;
	const whitelist = data.whitelist || [];
	const redirectRules = data.redirectRules || [];

	if (!enabled) return;

	const currentUrl = window.location.href;
	const hostname = getHostname(currentUrl);

	if (!hostname) return;

	// Do nothing if site is whitelisted
	if (whitelist.some((domain) => isDomainMatch(domain, hostname))) return;

	for (const rule of redirectRules) {
		if (isDomainMatch(rule.from, hostname)) {
			const redirectTo = rule.to.startsWith("https") ? rule.to : "https://" + rule.to;

			// Prevent infinite redirect
			if (getHostname(redirectTo) === hostname) return;

			console.log(`[Redirect] ${hostname} ➜ ${redirectTo}`);
			window.location.href = redirectTo;
			break;
		}
	}
});
