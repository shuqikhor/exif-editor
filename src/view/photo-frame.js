(function () {
	"use strict"

	/**
	 * Component to display image and 'loading' overlay.
	 * @class
	 * @param {HTMLElement} container - The container to insert photo
	 */
	var PhotoFrame = (function (container) {
		this.container = container

		let loadingDiv = document.createElement("div")
		loadingDiv.id = "photo-loading"
		loadingDiv.textContent = "Loading..."
		
		this.loadingStatus = loadingDiv
	})

	/**
	 * Show the 'loading' overlay
	 */
	PhotoFrame.prototype.loading = function () {
		this.container.append(this.loadingStatus)
	}

	/**
	 * Display the given image data.
	 * @param {string} imageData - base64 image data
	 * @returns 
	 */
	PhotoFrame.prototype.displayBase64 = function (imageData) {
		while (this.container.firstChild) {
			this.container.removeChild(this.container.firstChild)
		}

		let image = new Image()
		let base64Image = "data:image/jpeg;base64," + imageData
		image.src = base64Image
		image.id = "the-photo"

		this.container.append(image)
	}

	// export as module
	if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = { PhotoFrame }
        }
        exports.PhotoFrame = PhotoFrame
    } else {
        window.PhotoFrame = PhotoFrame
    }
})()