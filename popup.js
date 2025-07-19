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

document.getElementById("addDomain").addEventListener("click", () => {
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
});

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
document.getElementById("addRedirect").addEventListener("click", () => {
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
});

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
