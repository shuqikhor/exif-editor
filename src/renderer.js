const modelConfig = window.engine.getModelConfig()
const exifBox = new ExifList(document.getElementById('exif-info'))
const popup = new PopUp()
var fileList, currentIndex = 0, stage = 'start'


/* -- exifbox start -- */

	// add every details to ExifList
	for (let item of modelConfig) {
		let {name, title, type} = item
		exifBox.addRow(name, title, type)
	}

	// hook on saving function
	exifBox.onSave(async (imagePath, exif) => {
		if (imagePath != fileList[currentIndex]) return false

		return window.engine.saveExif(imagePath, exif)
	})

	// send exif data to ExifList when received
	window.engine.onExifData((path, exifObj) => {
		if (path == fileList[currentIndex]) {
			exifBox.setData(fileList[currentIndex], exifObj)
		}
	})	

/* -- exifbox end -- */


/* -- photoframe start -- */

	const photoDisplay = new PhotoFrame(document.querySelector("#photo-container"))

	// send image data to PhotoFrame when received
	window.engine.onImageData((path, imageData) => {
		if (path == fileList[currentIndex]) {
			photoDisplay.displayBase64(imageData)
		}
	})

/* -- photoframe end -- */


/* -- popup start -- */

	// setup broadcast channel
	const notification = new BroadcastChannel("notification");

	// forward message from main.js to broadcast channel
	window.engine.onError((tagName, message) => {
		notification.postMessage(message)
		exifBox.errorHighlight(tagName) // also highlight the input field in error
	})

/* -- popup end -- */


/* -- navigation start -- */

	// show section when navigated
	const showSection = (section) => {
		document.querySelectorAll(`.view-section:not(#view-${section})`).forEach((el) => {
			el.style.display = "none"
		})
		document.getElementById(`view-${section}`).style.display = "block"

		const hasNav = (section == 'photo')
		document.querySelector('nav#controls').style.display = hasNav ? 'flex' : 'none'
		document.querySelector('#container').classList.toggle('hasNav', hasNav)
	}

	const nextPhoto = () => {
		currentIndex++
		currentIndex %= fileList.length
		loadPhoto()
	}

	const prevPhoto = () => {
		currentIndex--
		if (currentIndex < 0) currentIndex += fileList.length
		loadPhoto()
	}

	// add event to buttons
	document.getElementById('btn-prev').addEventListener('click', (e) => prevPhoto())
	document.getElementById('btn-next').addEventListener('click', (e) => nextPhoto())

	// enable keyboard navigation using arrow keys
	window.addEventListener('keydown', e => {
		if (stage != 'photo') return
		if (e.target != document.body) return
		switch (e.key) {
			case 'ArrowLeft':
				prevPhoto()
				break
			case 'ArrowRight':
				nextPhoto()
				break
		}
	})

/* -- navigation end -- */


/* -- file loader start -- */

	/**
	 * Load a photo from `fileList`
	 * @param {int} index - The index of the photo in `fileList` array
	 */
	const loadPhoto = (index = currentIndex) => {
		document.querySelector('#page-current').textContent = currentIndex + 1
		window.engine.loadImage(fileList[index])
		photoDisplay.loading()
	}

	/**
	 * Filter files and load up photo viewer if everything goes well
	 * @param {Array} files - the files
	 */
	const processFiles = async (files) => {
		// filter out non-jpeg files
		files = files
			.map((file) => file.path)
			.filter((file) => /\.jpe?g$/.test(file))

		if (files.length == 0) return false

		// if only 1 file is selected, load entire directory
		if (files.length == 1) {
			let selectedFile = files[0]
			fileList = await window.engine.browseFolder(selectedFile)
			currentIndex = fileList.indexOf(selectedFile)
		} else {
			fileList = files
		}

		// update total images
		document.querySelector('#page-total').textContent = fileList.length

		// load selected photo
		loadPhoto()

		// navigate to photo view
		showSection('photo')
		stage = 'photo'
	}

	// add event to hidden file input
	document.getElementById('file-input').addEventListener('change', (e) => {
		if (e.target.files.length == 0) return

		processFiles(Array.from(e.target.files))
	}, false)

	// if a file is opened directly on this app, process immediately
	if (location.hash) {
		processFiles([{path: decodeURIComponent(location.hash.substring(1))}])
	}

/* -- file loader end -- */


/* -- dropzone start -- */

	const dropzone = document.querySelector('#dropzone')
	const fileInput = document.getElementById('file-input')

	dropzone.addEventListener('drop', (e) => {
		e.preventDefault()
		e.stopPropagation()

		processFiles(Array.from(e.dataTransfer.files))
	}, true)

	dropzone.addEventListener('click', (e) => {
		fileInput.click()
	}, true)

	document.body.addEventListener("dragover", (e) => {
		e.preventDefault()
	})
	
	dropzone.addEventListener('dragenter', (e) => {
		// console.log('File is in the Drop Space')
	})
	
	dropzone.addEventListener('dragleave', (e) => {
		// console.log('File has left the Drop Space')
	})

/* -- dropzone end -- */
