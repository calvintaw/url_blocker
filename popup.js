// Load settings (using chrome.storage.sync)
document.addEventListener("DOMContentLoaded", () => {
	chrome.storage.sync.get(["enabled", "whitelist", "redirectRules", "password"], (data) => {
		document.getElementById("toggle").checked = data.enabled ?? true;

		updateList(data.whitelist || []);
		updateRedirectList(data.redirectRules || []);
		updateWhitelistVisibility();
		updateRedirectlistVisibility();
		checkLoginInStatus(data.password);
		updatePasswordButton(data.password);
	});
});

async function checkLoginInStatus(password) {
	if (password) {
		const logged = await loginPassword();
		if (logged) updatePasswordButton(true);
	}
}

document.getElementById("toggle").addEventListener("change", (e) => {
	chrome.storage.sync.set({ enabled: e.target.checked });
});

const addList = () => {
	const input = document.getElementById("domainInput");
	const domain = input.value.trim();
	if (!domain) return;

	chrome.storage.sync.get(["whitelist"], (data) => {
		const list = data.whitelist || [];
		if (!list.includes(domain)) {
			list.push(domain);
			chrome.storage.sync.set({ whitelist: list }, () => {
				updateList(list);
				updateWhitelistVisibility();
				input.value = "";
			});
		}
	});
};

document.getElementById("addDomain").addEventListener("click", addList);

function updateList(list) {
	const el = document.getElementById("whitelist");
	el.innerHTML = "";
	list.forEach((domain, i) => {
		const row = document.createElement("div");
		row.className = "rule-item";
		row.innerHTML = `
         <span>${domain}</span>
         <button class="remove_btn" data-i="${i}" aria-label="Remove domain">&times;</button>
      `;
		el.appendChild(row);
	});

	// Delete handler
	el.querySelectorAll(".remove_btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const index = parseInt(btn.getAttribute("data-i"));
			list.splice(index, 1);
			chrome.storage.sync.set({ whitelist: list }, () => {
				updateList(list);
				updateWhitelistVisibility();
			});
		});
	});
}

// Load redirect rules
chrome.storage.sync.get(["redirectRules"], (data) => {
	updateRedirectList(data.redirectRules || []);
});

// Add redirect rule
const addRedirectRule = () => {
	const from = document.getElementById("fromDomain").value.trim();
	const to = document.getElementById("toDomain").value.trim() ?? "";
	if (!from) return;

	chrome.storage.sync.get(["redirectRules"], (data) => {
		const rules = data.redirectRules || [];
		// Avoid duplicates
		if (!rules.some((rule) => rule.from === from && rule.to === to)) {
			rules.push({ from, to, locked: false });
			chrome.storage.sync.set({ redirectRules: rules }, () => {
				updateRedirectList(rules);
				updateRedirectlistVisibility();
				document.getElementById("fromDomain").value = "";
				document.getElementById("toDomain").value = "";
			});
		}
	});
};

document.getElementById("addRedirect").addEventListener("click", addRedirectRule);

// Delete rule function (only if not locked)
function deleteRule(index, rules) {
	if (rules[index].locked) return;
	rules.splice(index, 1);
	chrome.storage.sync.set({ redirectRules: rules }, () => {
		updateRedirectList(rules);
		updateRedirectlistVisibility();
	});
}

// Toggle lock state for a rule
function toggleLock(index, rules) {
	rules[index].locked = !rules[index].locked;
	chrome.storage.sync.set({ redirectRules: rules }, () => updateRedirectList(rules));
}

function updateWhitelistVisibility() {
	const container = document.getElementById("whitelist");
	const section = container.closest("details");

	section.style.display = container.children.length === 0 ? "none" : "block";
}

function updateRedirectlistVisibility() {
	const container = document.getElementById("redirectList");
	const section = container.closest("details");

	section.style.display = container.children.length === 0 ? "none" : "block";
}

function updateRedirectList(rules) {
	const el = document.getElementById("redirectList");
	el.innerHTML = "";
	rules.forEach((rule, i) => {
		const isLocked = rule.locked;
		const lockSvg = isLocked
			? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#e53e3e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>`
			: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        <line x1="7" y1="16" x2="17" y2="16"></line>
      </svg>`;

		const row = document.createElement("div");
		row.className = "rule-item";
		row.innerHTML = `
			<span>${rule.from} &rarr; ${rule.to === "" ? "[blocked]" : rule.to}</span>
			<div class="rule-item-btns">
				<button class="remove_btn" data-i="${i}" aria-label="Remove redirect" ${isLocked ? "disabled" : ""} style="opacity:${
			isLocked ? 0.5 : 1
		}; cursor:${isLocked ? "not-allowed" : "pointer"}">&times;</button>
			<button class="lock" data-i="${i}" aria-label="${isLocked ? "Unlock rule" : "Lock rule"}" title="${
			isLocked ? "Unlock this rule" : "Lock this rule"
		}">
				${lockSvg}
			</button>
			</div>
		`;
		el.appendChild(row);
	});

	// Delete handler (only for unlocked)
	el.querySelectorAll(".remove_btn").forEach((btn) => {
		btn.addEventListener("click", () => {
			const index = parseInt(btn.getAttribute("data-i"));
			deleteRule(index, rules);
		});
	});

	// Lock/unlock handler
	el.querySelectorAll(".lock").forEach((btn) => {
		btn.addEventListener("click", async () => {
			const index = parseInt(btn.getAttribute("data-i"));
			if (rules[index].locked) {
				const rule = rules[index];
				const htmlMessage = `
  Are you sure you want to unblock this?<br>
  <strong>- ${rule.from} &rarr; ${rule.to === "" ? "[blocked]" : rule.to}</strong>
`;
				const confirmed = await showCustomConfirm(htmlMessage);

				if (confirmed) {
					toggleLock(index, rules);
				}
			} else {
				toggleLock(index, rules);
			}
		});
	});
}

function showCustomConfirm(message) {
	return new Promise((resolve) => {
		const overlay = document.getElementById("customConfirm");
		const msgEl = document.getElementById("customConfirmMessage");
		const yesBtn = document.getElementById("confirmYes");
		const noBtn = document.getElementById("confirmNo");

		msgEl.innerHTML = message; // <-- allow HTML here
		overlay.style.display = "flex";

		function cleanUp() {
			overlay.style.display = "none";
			yesBtn.removeEventListener("click", onYes);
			noBtn.removeEventListener("click", onNo);
		}

		function onYes() {
			cleanUp();
			resolve(true);
		}

		function onNo() {
			cleanUp();
			resolve(false);
		}

		yesBtn.addEventListener("click", onYes);
		noBtn.addEventListener("click", onNo);
	});
}

document.querySelectorAll("details").forEach((detailsEl) => {
	detailsEl.addEventListener("toggle", (e) => {
		if (detailsEl.open) {
			window.scrollTo({
				top: document.body.scrollHeight,
				behavior: "smooth",
			});
		} else {
			window.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		}
	});
});

function submitPassword(e, onYes) {
	e.preventDefault();
	const password = e.target.elements["password"].value;
	chrome.storage.sync.set({ password: password });
	onYes();
}

function updatePasswordButton(password) {
	const btn = document.getElementById("set_pwd_btn");
	btn.textContent = password ? "Remove Password" : "Set Password";

	// Remove all previous listeners
	const newBtn = btn.cloneNode(true);
	btn.parentNode.replaceChild(newBtn, btn);

	newBtn.addEventListener("click", () => {
		if (password) {
			chrome.storage.sync.set({ password: null }, () => {
				updatePasswordButton(false);
			});
		} else {
			setPassword();
		}
	});
}

function setPassword() {
	return new Promise((resolve) => {
		const overlay = document.getElementById("customConfirm");
		const form = document.getElementById("custom-confirm-form");
		const msgEl = document.getElementById("customConfirmMessage");
		const yesBtn = document.getElementById("confirmYes");
		const noBtn = document.getElementById("confirmNo");
		yesBtn.textContent = "Confirm";
		yesBtn.setAttribute("type", "submit");
		noBtn.textContent = "Cancel";
		noBtn.setAttribute("type", "reset");

		msgEl.innerHTML = `
		<label for="password">Set Password</label>
		<input type="password" id="password" name="password" placeholder="Enter password" />
	`;
		overlay.style.display = "flex";

		function handleSubmit(e) {
			submitPassword(e, onYes);
		}

		function cleanUp() {
			overlay.style.display = "none";
			yesBtn.removeEventListener("click", onYes);
			noBtn.removeEventListener("click", onNo);
			form.removeEventListener("submit", handleSubmit);
		}

		function onYes() {
			cleanUp();
			resolve(true);
			updatePasswordButton(true);
		}

		function onNo() {
			cleanUp();
			updatePasswordButton(false);
			resolve(false);
		}

		form.addEventListener("submit", handleSubmit);

		// yesBtn.addEventListener("click", onYes);
		noBtn.addEventListener("click", onNo);
	});
}

function checkPassword(e, onYes) {
	e.preventDefault();
	chrome.storage.sync.get(["password"], ({ password }) => {
		const pwd = e.target.elements["password"].value;
		if (pwd === password) {
			onYes();
		} else {
			const msgEl = document.getElementById("customConfirmMessage");
			msgEl.innerHTML += `
				<p style="color: red; margin: -5px 0 2px 0; font-size: 12px; font-weight: normal;">Wrong Password</p>
			`;
		}
	});
}

function loginPassword() {
	return new Promise((resolve) => {
		const overlay = document.getElementById("customConfirm");
		const form = document.getElementById("custom-confirm-form");
		const msgEl = document.getElementById("customConfirmMessage");
		const yesBtn = document.getElementById("confirmYes");
		const noBtn = document.getElementById("confirmNo");
		yesBtn.textContent = "Submit";
		yesBtn.setAttribute("type", "submit");
		noBtn.textContent = "Cancel";
		noBtn.setAttribute("type", "reset");

		msgEl.innerHTML = `
			<label for="password">Login with Password</label>
			<input type="password" id="password" name="password" placeholder="Enter password" />
	`;
		overlay.style.display = "flex";

		const handleSubmit = (e) => {
			checkPassword(e, onYes);
		};

		function cleanUp() {
			overlay.style.display = "none";
			yesBtn.removeEventListener("click", onYes);
			noBtn.removeEventListener("click", onNo);
			form.removeEventListener("submit", handleSubmit);
		}

		function onYes() {
			cleanUp();
			updatePasswordButton(true);
			resolve(true);
		}

		function onNo() {
			window.close();
			cleanUp();
			updatePasswordButton(true);
			resolve(false);
		}
		noBtn.addEventListener("click", onNo);
		form.addEventListener("submit", handleSubmit);
	});
}

const sites = [
	"google.com",
	"youtube.com",
	"facebook.com",
	"instagram.com",
	"chatgpt.com",
	"wikipedia.org",
	"reddit.com",
	"x.com", // Formerly Twitter
	"whatsapp.com",
	"bing.com",
	"amazon.com",
	"yahoo.com",
	"temu.com",
	"duckduckgo.com",
	"yahoo.co.jp",
	"tiktok.com",
	"yandex.ru",
	"weather.com",
	"microsoftonline.com",
	"msn.com",
	"microsoft.com",
	"live.com",
	"fandom.com",
	"linkedin.com",
	"netflix.com",
	"pinterest.com",
	"twitch.tv",
	"openai.com",
	"naver.com",
	"office.com",
	"canva.com",
	"vk.com",
	"paypal.com",
	"aliexpress.com",
	"discord.com",
	"github.com",
	"spotify.com",
	"apple.com",
	"imdb.com",
	"bilibili.com",
	"roblox.com",
	"globo.com",
	"amazon.co.jp",
	"nytimes.com",
	"samsung.com",
	"mail.ru",
	"ebay.com",
	"quora.com",
	"walmart.com",
	"bbc.co.uk",
	"amazon.de",
	"telegram.org",
	"dailymotion.com",
	"coupang.com",
	"bbc.com",
	"booking.com",
	"espn.com",
	"brave.com",
	"cnn.com",
	"indeed.com",
	"rakuten.co.jp",
	"google.com.br",
	"google.co.uk",
	"zoom.us",
	"adobe.com",
	"usps.com",
	"amazon.co.uk",
	"ozon.ru",
	"cricbuzz.com",
	"accuweather.com",
	"etsy.com",
	"uol.com.br",
	"dzen.ru",
	"steampowered.com",
	"shop.app",
	"marca.com",
	"rutube.ru",
	"shopify.com",
	"steamcommunity.com",
	"ecosia.org",
	"infobae.com",
	"google.de",
	"disneyplus.com",
	"theguardian.com",
	"primevideo.com",
	"gmail.com",
	"zillow.com",
	"dailymail.co.uk",
	"amazon.in",
	"linktree.ee",
	"people.com",
	"google.it",
	"instructure.com",
	"google.es",
	"shein.com",
	"messenger.com",
	"max.com",
	"wildberries.ru",
	"avito.ru",
	"foxnews.com",
	"outlook.com",
	"indeed.co.in",
	"wayfair.com",
	"bestbuy.com",
	"target.com",
	"homedepot.com",
	"lowes.com",
	"bankofamerica.com",
	"chase.com",
	"wellsfargo.com",
	"craigslist.org",
	"webmd.com",
	"mayoclinic.org",
	"healthline.com",
	"forbes.com",
	"bloomberg.com",
	"wsj.com",
	"cnbc.com",
	"reuters.com",
	"techcrunch.com",
	"theverge.com",
	"wired.com",
	"ign.com",
	"gamespot.com",
	"rottentomatoes.com",
	"metacritic.com",
	"goodreads.com",
	"epicgames.com",
	"chess.com",
	"geeksforgeeks.org",
	"stackoverflow.com",
	"w3schools.com",
	"mdn.mozilla.net",
	"freecodecamp.org",
	"codecademy.com",
	"udemy.com",
	"coursera.org",
	"edx.org",
	"khanacademy.org",
	"nationalgeographic.com",
	"nasa.gov",
	"whitehouse.gov",
	"gov.uk",
	"canada.ca",
	"aus.gov.au",
	"un.org",
	"who.int",
	"cdc.gov",
	"nih.gov",
	"zara.com",
	"hm.com",
	"nike.com",
	"adidas.com",
	"sephora.com",
	"ulta.com",
	"kohls.com",
	"macys.com",
	"nordstrom.com",
	"gap.com",
	"oldnavy.com",
	"walmart.ca",
	"walmart.mx",
	"carrefour.fr",
	"tesco.com",
	"sainsburys.co.uk",
	"lidl.de",
	"aldi.de",
	"alibaba.com",
	"target.ca",
	"costco.com",
	"kroger.com",
	"cvs.com",
	"walgreens.com",
	"docomo.ne.jp", // Mobile carrier Japan
	"livedoor.jp", // Japanese news/blog
	"nikkei.com", // Japanese business news
	"glo.bo", // Short URL for Globo
	"olx.com", // Classifieds
	"gumtree.com", // Classifieds UK
	"leboncoin.fr", // Classifieds France
	"autoscout24.de", // Car marketplace Germany
	"mobile.de", // Car marketplace Germany
	"rightmove.co.uk", // Real estate UK
	"zoopla.co.uk", // Real estate UK
	"realtor.com", // Real estate US
	"zumper.com", // Rental US
	"redfin.com", // Real estate US
	"glassdoor.com", // Jobs & company reviews
	"npr.org", // US public radio news
	"pbs.org", // US public broadcasting
	"usatoday.com", // US newspaper
	"latimes.com", // Los Angeles Times
	"chicagotribune.com", // Chicago Tribune
	"washingtonpost.com", // Washington Post
	"economist.com", // The Economist
	"time.com", // Time magazine
	"nationalgeographic.org", // National Geographic (non-profit arm)
	"smithsonianmag.com", // Smithsonian Magazine
	"history.com", // History Channel
	"britannica.com", // Encyclopaedia Britannica
	"dictionary.com", // Dictionary and Thesaurus
	"thesaurus.com", // Thesaurus
	"wordreference.com", // Online dictionaries
	"duolingo.com", // Language learning
	"grammarly.com", // Writing assistant
	"scribd.com", // Digital library
	"issuu.com", // Digital publishing platform
	"stackoverflow.co", // Developer Q&A (aliased for stackoverflow.com)
	"jsfiddle.net", // Online code editor
	"codepen.io", // Online code editor
	"repl.it", // Online IDE
	"kaggle.com", // Data science community
	"medium.com", // Blogging platform
	"wordpress.com", // Website builder/blogging
	"blogger.com", // Blog publishing
	"trello.com", // Project management
	"asana.com", // Project management
	"notion.so", // Workspace
	"evernote.com", // Note-taking
	"dropbox.com", // Cloud storage
	"drive.google.com", // Google Drive
	"onedrive.live.com", // Microsoft OneDrive
	"icloud.com", // Apple iCloud
	"wetransfer.com", // File transfer
	"sendgrid.com", // Email delivery
	"mailchimp.com", // Email marketing
	"hubspot.com", // CRM & marketing
	"salesforce.com", // CRM
	"oracle.com", // Software & cloud
	"sap.com", // Enterprise software
	"ibm.com", // Technology and consulting
	"dell.com", // Computers
	"hp.com", // Computers
	"cnet.com", // Tech news & reviews
	"zdnet.com", // Tech news
	"howtogeek.com", // Tech tutorials
	"lifewire.com", // Tech tips
	"digitaltrends.com", // Tech news
	"macrumors.com", // Apple news
	"androidcentral.com", // Android news
	"gsmarena.com", // Phone specs and reviews
	"anandtech.com", // Hardware reviews
	"tomshardware.com", // PC hardware news
];

function enableAutocomplete(inputId, type) {
	const input = document.getElementById(inputId);
	const suggestionBox = document.createElement("ul");
	suggestionBox.className = "autocomplete-suggestions";
	document.body.appendChild(suggestionBox);
	const dataList = sites;

	let suggestions = [];
	let selectedIndex = -1;

	function updatePosition() {
		const rect = input.getBoundingClientRect();
		suggestionBox.style.top = `${rect.bottom + window.scrollY}px`;
		suggestionBox.style.left = `${rect.left + window.scrollX}px`;
		suggestionBox.style.width = `${rect.width}px`;
	}

	input.addEventListener("input", () => {
		const value = input.value.toLowerCase();
		suggestionBox.innerHTML = "";
		suggestions = [];
		selectedIndex = -1;

		if (!value) return;

		updatePosition();
		suggestions = dataList.filter((item) => item.toLowerCase().includes(value));

		suggestions.forEach((item, index) => {
			const li = document.createElement("li");
			li.textContent = item;
			li.dataset.index = index;
			li.addEventListener("click", () => {
				input.value = item;
				suggestionBox.innerHTML = "";
			});
			suggestionBox.appendChild(li);
		});
	});

	input.addEventListener("keydown", (e) => {
		const items = suggestionBox.querySelectorAll("li");

		if (e.key === "ArrowDown") {
			e.preventDefault();

			if (selectedIndex < items.length - 1) selectedIndex++;
			updateHighlight(items);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (selectedIndex > 0) selectedIndex--;
			updateHighlight(items);
		} else if (e.key === "Tab" && selectedIndex >= 0) {
			e.preventDefault();
			input.value = suggestions[selectedIndex];
			suggestionBox.innerHTML = "";
		} else if (e.key === "Enter") {
			if (type === "whitelist" && e.target.value.trim()) {
				addList();
				input.value = "";
			}
			if (type === "redirect" && inputId === "fromDomain") {
				document.getElementById("toDomain").focus();
			}

			suggestionBox.innerHTML = "";
		}
	});

	function updateHighlight(items) {
		items.forEach((el, i) => {
			el.classList.toggle("selected", i === selectedIndex);
			if (i === selectedIndex) input.value = suggestions[i];
		});
	}

	document.addEventListener("click", (e) => {
		if (!suggestionBox.contains(e.target) && e.target !== input) {
			suggestionBox.innerHTML = "";
		}
	});

	window.addEventListener("resize", updatePosition);
	input.addEventListener("focus", updatePosition);
}

// function enableAutocomplete(inputId) {
// 	const input = document.getElementById(inputId);
// 	const suggestionBox = document.createElement("ul");
// 	suggestionBox.className = "autocomplete-suggestions";
// 	document.body.appendChild(suggestionBox);
// 	const dataList = sites;

// 	function updatePosition() {
// 		const rect = input.getBoundingClientRect();
// 		suggestionBox.style.top = `${rect.bottom + window.scrollY}px`;
// 		suggestionBox.style.left = `${rect.left + window.scrollX}px`;
// 		suggestionBox.style.width = `${rect.width}px`;
// 	}

// 	input.addEventListener("input", () => {
// 		const value = input.value.toLowerCase();
// 		suggestionBox.innerHTML = "";

// 		if (!value) return;

// 		updatePosition();
// 		const filtered = dataList.filter((item) => item.toLowerCase().includes(value));
// 		filtered.forEach((item) => {
// 			const li = document.createElement("li");
// 			li.textContent = item;
// 			li.addEventListener("click", () => {
// 				input.value = item;
// 				suggestionBox.innerHTML = "";
// 			});
// 			suggestionBox.appendChild(li);
// 		});
// 	});

// 	document.addEventListener("click", (e) => {
// 		if (!suggestionBox.contains(e.target) && e.target !== input) {
// 			suggestionBox.innerHTML = "";
// 		}
// 	});

// 	window.addEventListener("resize", updatePosition);
// 	input.addEventListener("focus", updatePosition);
// }

enableAutocomplete("domainInput", "whitelist");
enableAutocomplete("fromDomain", "redirect");
enableAutocomplete("toDomain", "redirect");

// // Export settings
// document.getElementById("exportSettings").addEventListener("click", () => {
// 	chrome.storage.sync.get(null, (data) => {
// 		const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
// 		const url = URL.createObjectURL(blob);
// 		const a = document.createElement("a");
// 		a.download = "malicious-url-settings.json";
// 		a.href = url;
// 		a.click();
// 	});
// });

// // Import settings
// document.getElementById("importFile").addEventListener("change", (e) => {
// 	const file = e.target.files[0];
// 	if (!file) return;

// 	const reader = new FileReader();
// 	reader.onload = () => {
// 		try {
// 			const data = JSON.parse(reader.result);
// 			chrome.storage.sync.set(data, () => location.reload());
// 		} catch (err) {
// 			alert("Invalid JSON file.");
// 		}
// 	};
// 	reader.readAsText(file);
// });
