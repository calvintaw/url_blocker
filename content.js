if (window !== window.top) {
	// Don't run inside iframes
	return;
}

if (window.__domainMatcherAlreadyRan) {
	// Prevent duplicate execution
	return;
}
window.__domainMatcherAlreadyRan = true;

function getHostname(url) {
	try {
		return new URL(url).hostname;
	} catch (e) {
		return null;
	}
}

function isDomainMatch(pattern, hostname) {
	pattern = pattern.trim().toLowerCase();
	hostname = hostname.trim().toLowerCase();

	if (pattern === hostname) return true;
	if (hostname.endsWith("." + pattern)) return true;
	if (pattern.startsWith("*.")) {
		const base = pattern.slice(2);
		return hostname === base || hostname.endsWith("." + base);
	}
	return false;
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
			if (rule.to === "") {
				window.location.href = "chrome://newtab/";
				break;
			}

			const redirectTo = rule.to.startsWith("https") ? rule.to : "https://" + rule.to;

			// Prevent infinite redirect
			if (isDomainMatch(getHostname(redirectTo), hostname)) return;

			window.location.href = redirectTo;
			break;
		}
	}
});
