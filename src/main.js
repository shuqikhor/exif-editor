const { app, BrowserWindow, ipcMain, nativeTheme } = require('electron')
const path = require('path')
const fs = require('fs')
const piexif = require('piexifjs').piexif
var fileToOpen = false

/* -- initiation start -- */

	let win, exifCache = {}

	const createWindow = () => {
		win = new BrowserWindow({
			width: 800,
			height: 600,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				enableRemoteModule: false,
				preload: path.join(__dirname, 'preload.js'),
			},
		})
		win.loadFile('./view/index.html', {
			hash: fileToOpen || ''
		})
		win.on('page-title-updated', (e) => e.preventDefault());
		win.setTitle("Exif Editor")
		// win.webContents.openDevTools()
	}

/* -- initiation end -- */


/* -- data configuration start -- */

	const modelConfig = [
		{
			name: "Make",
			identifiers: [["0th", 271]],
			title: "Camera Make",
			type: "Ascii",
			value: ""
		},
		{
			name: "Model",
			identifiers: [["0th", 272]],
			title: "Camera Model",
			type: "Ascii",
			value: ""
		},
		{
			name: "Software",
			identifiers: [["0th", 305]],
			title: "Software",
			type: "Ascii",
			value: ""
		},
		{
			name: "DateTime",
			identifiers: [["0th", 306], ["Exif", 36867], ["Exif", 36868]],
			title: "Date Time",
			type: "DateTime",
			value: ""
		},
		{
			name: "ExposureTime",
			identifiers: [["Exif", 33434]],
			title: "Shutter Speed",
			type: "Rational",
			value: "",
			onDisplay: (value) => {
				/*
					shutter speed is usually displayed as fraction instead of decimals
					so here I'm detecting if it is 1/30s, then it won't be shown as 0.033333
					but if it's 1.5s, then it should be shown as 1.5
				*/

				if (value[1] == 1) return value[0]
				if (/^10+$/.test(value[1])) return (value[0] / value[1])
				
				return value[0] + "/" + value[1]
			},
			onSave: (value) => {
				/*
					convert value back to [numerator, denominator] format
				*/
				if (value == null) return null
				if (value.indexOf("/") !== -1) {
					return value.split("/").map(val => parseInt(val))
				}
				if (value.indexOf(".") !== -1) {
					value = value.replace(/0*$/, "")
					let [, decimal] = value.split(".")
					let decimalPlace = (decimal && decimal.length) ? 10 ** decimal.length : 1
					return [parseInt(value.replace(".", "")), decimalPlace]
				}
				return [parseInt(value), 1]
			},
			validate: (value) => (/^\d+(\/\d+|\.\d+)?$/.test(value))
		},
		{
			name: "FNumber",
			identifiers: [["Exif", 33437]],
			title: "F Number",
			type: "Rational",
			value: ""
		},
		{
			name: "ISOSpeedRatings",
			identifiers: [["Exif", 34855]],
			title: "ISO Speed",
			type: "Short",
			value: ""
		}
	]

/* -- data configuration end -- */


/* -- main functions start -- */

	/**
	 * Trim ExifObj returned from piexifjs to only the data we need
	 * @param {object} exifObj - ExifObj returned from piexifjs
	 * @returns {object} - A dictionary consisting ExifTagName-value pairs
	 */
	const trimExif = (exifObj) => {
		let trimmed = {}
		for (let item of modelConfig) {
			let { name, identifiers } = item
			let [ifd, key] = identifiers[0]

			let value = exifObj[ifd][key] ?? null
			if (value !== null) {
				if (item.onDisplay) {
					value = item.onDisplay(value)
				} else {
					switch (item.type) {
						case "Rational":
							let [num, deno] = value
							value = num / deno
							if (value % 1 == 0.0) value = value.toFixed(1)
							else value = value.toString()
							break
					}
				}
			}

			trimmed[name] = value
		}
		return trimmed
	}

	/**
	 * Load an image and then:
	 * - send image data as base64image to front-end
	 * - load Exif data with piexifjs and send to front-end
	 * @param {string} imagePath - The path to the image to be loaded
	 */
	const loadPhoto = async (imagePath) => {
		console.log(`Reading data from ${imagePath}`)

		win.setTitle(path.basename(imagePath))

		let cached = exifCache[imagePath]

		fs.readFile(imagePath, (err, fileData) => {
			let imageData = Buffer.from(fileData).toString('base64')

			// send to front end for display
			win.webContents.send('imageData', imagePath, imageData)

			// cache data so I don't need to parse again
			if (!cached) {
				let exifObj = piexif.load(fileData.toString('binary'))
				win.webContents.send('exifData', imagePath, trimExif(exifObj))
				exifCache[imagePath] = exifObj
			}
		})

		if (cached) {
			win.webContents.send('exifData', imagePath, trimExif(cached))
		}
	}

	/**
	 * Reload cache and send error message
	 * @param {string} tagName - The tag name to be highlighted
	 * @param {string} errorMessage - The error message to display
	 * @returns {boolean} - Always return false
	 */
	const saveFailed = (tagName, errorMessage) => {
		win.webContents.send('error', tagName, errorMessage)
		return false
	}

	/**
	 * Save edited Exif data to the image
	 * @param {*} imagePath - The path to the corresponding image
	 * @param {*} data - The data to be saved
	 * @returns {boolean} - Return true if saved successfully
	 */
	const saveExif = (imagePath, data) => {
		let exifObj = exifCache[imagePath]

		// process each key-value pair
		for (let item of modelConfig) {
			let {name, identifiers, type, title} = item

			let value = data[name]
			if (value === null) continue

			// if the item has its own validation method, use it
			if (item.validate && !item.validate(value)) {
				return saveFailed(name, `${title} is invalid`)
			}

			// if the item has its own formatting method, use it
			if (item.onSave) {
				value = item.onSave(value)
			} else {
				switch (type) {
					case 'Short':
						value = parseInt(value)
						if (isNaN(value)) {
							return saveFailed(name, `${title} is invalid`)
						}
						break
					case 'Rational':
						// convert decimals to [numerator, denominator] format
						if (!/^\d+(\.\d*)?$/.test(value)) {
							return saveFailed(name, `${title} is invalid`)
						}
						if (value.indexOf(".") === -1) {
							value = [parseInt(value), 1]
						} else {
							value = value.replace(/0*$/, "")
							let [, decimal] = value.split(".")
							let decimalPlace = (decimal && decimal.length) ? 10 ** decimal.length : 1
							value = [parseInt(value.replace(".", "")), decimalPlace]
						}
						break
					case 'DateTime':
						// validate datetime format
						const dateRegex = /^(20|19)\d{2}\:(0\d|1[012])\:([012]\d|3[01]) ([01]\d|2[0-3])\:[0-5]\d\:[0-5]\d$/
						if (!dateRegex.test(value)) {
							return saveFailed(name, `${title} is invalid`)
						}
						break
				}
			}

			for (let identifier of identifiers) {
				let [ifd, key] = identifier

				exifObj[ifd][key] = value
			}
		}

		try {
			let exifbytes = piexif.dump(exifObj)
			let imageData = fs.readFileSync(imagePath).toString('binary')
			let inserted = piexif.insert(exifbytes, imageData)
			let fileBuffer = Buffer.from(inserted, "binary")
			fs.writeFileSync(imagePath, fileBuffer)
		} catch (e) {
			alert(e.errorMessage)
		} finally {
			exifCache[imagePath] = exifObj
		}


		return true
	}

/* -- main functions end -- */


/* -- event hook start -- */

	ipcMain.handle('loadPhoto', (channel, imagePath) => loadPhoto(imagePath))

	ipcMain.handle('saveExif', (channel, imagePath, data) => saveExif(imagePath, data))

	// send model configuration to renderer
	ipcMain.on('modelConfig', (e) => {
		let clone = JSON.parse(JSON.stringify(modelConfig))
		e.returnValue = clone
	})

	// change theme
	ipcMain.handle('dark-mode:system', () => {
		nativeTheme.themeSource = 'system'
	})

	// handle browse folder request
	ipcMain.handle('browseFolder', async (channel, filePath) => {
		const dirPath = path.dirname(filePath)
		console.log('Reading dir ' + dirPath)

		let fileList = fs.readdirSync(dirPath)
			.filter(filename => ['.jpg', '.jpeg'].includes(path.extname(filename).toLowerCase()))
			.map(filename => path.join(dirPath, filename))
		console.log(fileList)

		return fileList
	})

/* -- event hook end -- */


/* -- app stuff start -- */

	app.whenReady().then(() => {
		// check for file open on Windows
		if (process.platform == 'win32' && process.argv.length > 1 && !process.argv[0].indexOf('electron')) {
			fileToOpen = process.argv[1]
		}

		createWindow()

		// app.on('activate', () => {
		// 	if (Browserwin.getAllWindows().length === 0) createWindow()
		// })
	})

	// check for file open on Mac
	app.on('open-file', (event, filePath) => {
		fileToOpen = filePath
    })

	app.on('window-all-closed', () => {
		app.quit()
		// if (process.platform !== 'darwin') app.quit()
	})

/* -- app stuff end -- */