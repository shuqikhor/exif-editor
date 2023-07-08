(function () {
	"use strict"

	/**
	 * Create a notification text bubble that disappears after 2 seconds.
	 * @class
	 */
	var PopUp = (function () {
		let bubble = document.createElement("div")
		bubble.classList.add("popup-bubble")
		bubble.style.display = "none"
		this.bubble = bubble
		document.body.append(bubble)

		this.bc = new BroadcastChannel("notification");
		this.bc.onmessage = (e) => {
			this.show(e.data)
		}

		this.timer = {}
	})

	/**
	 * Make the text bubble appear. This will override the previous bubble if it hasn't disappear yet.
	 * @param {string} message - The message to display inside the text bubble
	 */
	PopUp.prototype.show = function (message) {
		clearTimeout(this.timer)
		this.bubble.textContent = message
		this.bubble.style.display = "block"
		this.timer = setTimeout(() => {
			this.bubble.style.display = "none"
		}, 2000)
	}

	// export as module
	if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = { PopUp }
        }
        exports.PopUp = PopUp
    } else {
        window.PopUp = PopUp
    }
})()