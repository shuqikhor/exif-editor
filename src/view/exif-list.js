(function () {
	"use strict"

	const notification = new BroadcastChannel("notification");

	/**
	 * A component to display Exif data.
	 * @class
	 * @param {HTMLElement} container - the container for Exif list
	 */
	var ExifList = (function (container) {
		this.container = container
		this.currentImage = ""
		this.table = []
		this.inputs = {}
		this.data = {}
		this.edited = {}
		this.changed = false

		let buttonContainer = document.createElement("div")
		buttonContainer.id = "exif-btn-container"
		this.container.append(buttonContainer)
		this.buttonContainer = buttonContainer

		let button = document.createElement("button")
		button.id = "btn-save-exif"
		button.textContent = "Save"
		button.disabled = true
		buttonContainer.append(button)
		this.button = button

		button.addEventListener('click', (e) => {
			button.disabled = true
		})
	})

	/**
	 * A hook for `renderer.js` to initiate saving procedure
	 * @param {saveCallback} callback - A function to call when [save] button is clicked.
	 */
	ExifList.prototype.onSave = async function (callback) {
		this.button.addEventListener('click', (e) => {
			callback(this.currentImage, this.edited).then((result) => {
				if (result) {
					this.data = {...this.edited}
					Object.values(this.inputs).forEach((input) => input.classList.remove('changed', 'error'))
					notification.postMessage("Saved successfully")
				} else {
					if (hasChanged(this.data, this.edited)) {
						this.button.disabled = false
					}
					// notification.postMessage("Failed to save")
				}
			})
		})
	}

	/**
	 * Add a row to the Exif list
	 * @param {string} name - The name of the Exif tag
	 * @param {string} title - The title to display as label
	 */
	ExifList.prototype.addRow = function (name, title) {
		let row = document.createElement("div")
		row.classList.add('exif-row')
		
		let label = document.createElement("label")
		label.textContent = title

		let input = document.createElement("input")
		input.type = "text"
		this.inputs[name] = input

		this.container.insertBefore(row, this.buttonContainer)
		row.append(label)
		row.append(input)

		this.table[name] = row
		this.data[name] = ""
		
		input.addEventListener('input', (e) => {
			this.edited[name] = input.value
			
			input.classList.toggle('error', false)
			input.classList.toggle('changed', (this.edited[name] != this.data[name]))

			this.changed = hasChanged(this.data, this.edited)
			this.button.disabled = !this.changed
		})

		input.addEventListener('keydown', (e) => {
			if (e.code == 'Enter') {
				input.blur()
				this.button.click()
			}
		})
	}

	/**
	 * Empty the list
	 */
	ExifList.prototype.clearData = function () {
		for (let i in this.data) {
			this.data[i] = null
		}
		this.edited = {...this.data}
		Object.values(this.inputs).forEach((input) => input.classList.remove('changed', 'error'))
		this.changed = false
	}

	/**
	 * Set the value of an Exif property
	 * @param {string} name - The Exif tag name
	 * @param {any} value - The vaue
	 */
	ExifList.prototype.setValue = function (name, value) {
		this.data[name] = value
		this.edited[name] = value
		this.inputs[name].value = value
	}

	/**
	 * Update the Exif list
	 * @param {string} imagePath - The path of the corresponding image (for verification purpose only)
	 * @param {object} data - The tagname-value pair list
	 */
	ExifList.prototype.setData = function (imagePath, data) {
		this.currentImage = imagePath
		Object.values(this.inputs).forEach((input) => input.classList.remove('changed', 'error'))
		for (let name in data) {
			this.setValue(name, data[name])
		}
	}

	/**
	 * Highlight an input in red
	 * @param {string} name - the Exif tag name to be highlighted
	 */
	ExifList.prototype.errorHighlight = function (name) {
		this.inputs[name].classList.toggle('error', true)
	}

	function hasChanged (original, edited) {
		for (let i in original) {
			if (edited[i] != original[i]) {
				return true
			}
		}
		
		return false
	}

	// export as module
	if (typeof exports !== 'undefined') {
        if (typeof module !== 'undefined' && module.exports) {
            exports = module.exports = { ExifList }
        }
        exports.ExifList = ExifList
    } else {
        window.ExifList = ExifList
    }
})()

/**
 * Callback for saving edited Exif.
 *
 * @callback saveCallback
 * @param {string} imagePath - Image path to identify the image to be edited
 * @param {object} exif - The edited Exif
 */