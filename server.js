'use strict';

const express = require('express');
const imager = require('./imager');
const url = require("url");
const app = express();

app.use(express.static(__dirname + '/public'));

let history = {
	"recent_path": [],
	"recent_text": [],
	"recent_sizes": [],
	"top_sizes": [],
	"top_referrers": [],
	"hits": []
}

/*
*
*
*
*/
app.get('/', function (req, res) {
	res.sendFile(__dirname + "/public/")
})

app.get('/stats', function (req, res) {
	res.sendFile(__dirname + "/public/stats.html")
})

// start the server
app.listen(8080, "127.0.0.1", (err) => {
	if (err) console.error('error starting server', err);
	else console.log('Server Started');
});



/* server functions
 *
 *
 *    ####  ###### #####  #    # ###### #####     ###### #    # #    #  ####  ##### #  ####  #    #  ####
 *   #      #      #    # #    # #      #    #    #      #    # ##   # #    #   #   # #    # ##   # #
 *    ####  #####  #    # #    # #####  #    #    #####  #    # # #  # #        #   # #    # # #  #  ####
 *        # #      #####  #    # #      #####     #      #    # #  # # #        #   # #    # #  # #      #
 *   #    # #      #   #   #  #  #      #   #     #      #    # #   ## #    #   #   # #    # #   ## #    #
 *    ####  ###### #    #   ##   ###### #    #    #       ####  #    #  ####    #   #  ####  #    #  ####
 *
 *
 */


app.get('/img/:width/:height', function (req, res) {
	let width = req.params.width;
	let height = req.params.height;

	if (width % 1 !== 0 || height % 1 !== 0 || height == NaN || width == NaN) {
		res.status(400).send("You need a number");
		return
	};


	if (width > 2000 || height > 2000) {
		res.status(403).send("Invalid size")
		return
	};
	if (width <= 0 || height <= 0) {
		res.status(400).send("Invalid Size")
		return
	};


	width = parseInt(width);
	height = parseInt(height);

	let square = req.query.square;
	if (square <= "0") {
		res.status(400).send("Above 0 plox")
		return
	}

	if (square % 1 == 0) {
		square = parseInt(square);
	} else {
		if (square !== undefined) {
			res.status(400).send("Whole numbers only past the wall, in trumpscript we only do whole numbers")
			return
		}
	}
	let text = req.query.text;



	let parsed_url = url.parse(req.url, true)
	let encoded_url = []
	encoded_url.push(parsed_url.pathname)
	if (parsed_url.query.square !== undefined) {
		encoded_url.push(`?square=${parsed_url.query.square}`)
		if (parsed_url.query.text !== undefined) {
			encoded_url.push(`&text=${encodeURIComponent(parsed_url.query.text)}`)
		}
	} else {
		if (parsed_url.query.text !== undefined) {
			encoded_url.push(`?text=${encodeURIComponent(parsed_url.query.text)}`)
		}
	}
	let encoded = encoded_url.join("");


	history.recent_path.forEach(function (value, i) {
		if (value === encoded) {
			history.recent_path.splice(i, 1)
		}
	});
	if (history.recent_path.length >= 10) {
		history.recent_path.shift()
	}
	history.recent_path.push(encoded)
	let width_height = {
		"w": width,
		"h": height
	}
	history.recent_sizes.forEach(function (value, i) {
		if (value.w == width_height.w && value.h == width_height.h) {
			history.recent_sizes.splice(i, 1)
		}
	});
	if (history.recent_sizes.length >= 10) {
		history.recent_sizes.shift()
	}
	history.recent_sizes.push(width_height)

	if (history.top_sizes.length == 0) {
		let stats_container = {
			w: width,
			h: height,
			n: 1
		}
		history.top_sizes.push(stats_container)
	} else {
		let inlist = false;
		history.top_sizes.forEach(function (value, i) {
			if (value.w == width && value.h == height) {
				value.n += 1;
				inlist = true;
			}
		});
		if (!inlist) {
			let stats_container = {
				w: width,
				h: height,
				n: 1
			}
			history.top_sizes.push(stats_container)
		}
	}
	let parsed_query_text = parsed_url.query.text;
	if (parsed_query_text !== undefined) {
		history.recent_text.forEach(function (value, i) {
			if (value == parsed_query_text) {
				history.recent_text.splice(i, 1)
			}
		});
		if (history.recent_text.length >= 10) {
			history.recent_text.shift()
		}
		history.recent_text.push(parsed_query_text)
	}

	let referer = req.get("Referrer")

	if (referer !== undefined) {
		if (history.top_referrers.length == 0) {
			let referrers_counter = {
				ref: referer,
				n: 1
			}
			history.top_referrers.push(referrers_counter)
		} else {
			let inlist = false;
			history.top_referrers.forEach(function (value, i) {
				if (value.ref == referer) {
					value.n += 1;
					inlist = true;
				}
			});
			if (!inlist) {
				let referrers_counter = {
					ref: referer,
					n: 1
				}
				history.top_referrers.push(referrers_counter)
			}
		}
	}

	history.hits.push(Date.now())

	imager.sendImage(res, width, height, square, text)
})


app.get("/stats/paths/recent", function (req, res) {
	let reversed_list = history.recent_path
	res.send(reversed_list.reverse())
	reversed_list.reverse()
	return
})


app.get("/stats/sizes/recent", function (req, res) {
	let reversed_list = history.recent_sizes
	res.send(reversed_list.reverse())
	reversed_list.reverse()
	return
})


app.get("/stats/texts/recent", function (req, res) {
	let reversed_list = history.recent_text
	res.send(reversed_list.reverse())
	reversed_list.reverse()
	return
})


app.get("/stats/sizes/top", function (req, res) {

	let sortedArray = history.top_sizes.sort(sortByProperty("n"))
	res.send(sortedArray.reverse().slice(0, 10))
	return;
})


app.get("/stats/referrers/top", function (req, res) {
	let sortedArray = history.top_referrers.sort(sortByProperty("n"))
	res.send(sortedArray.reverse().slice(0, 10))
	return
})


app.get("/stats/hits", function (req, res) {
	const now = Date.now()
	let time_json = [{
			"title": '5s',
			"count": 0
		},
		{
			"title": '10s',
			"count": 0
		},
		{
			"title": '15s',
			"count": 0
		}
	]
	history.hits.forEach(function (hit, i) {
		if (hit > now - 5000) {
			time_json[0].count += 1
		}
		if (hit > now - 10000) {
			time_json[1].count += 1
		}
		if (hit > now - 15000) {
			time_json[2].count += 1
		}
	});
	res.send(time_json)
	return
})

app.delete("/stats", function (req, res) {
	history = {
		"recent_path": [],
		"recent_text": [],
		"recent_sizes": [],
		"top_sizes": [],
		"top_referrers": [],
		"hits": []
	}
	res.send("Drop Mic, and table")
})
/*
* This method takes a give object in an array and sorts the list by that property
* In this case I sort two objects to get the top most results to present
*/
let sortByProperty = function (property) {
	return function (x, y) {
		return ((x[property] === y[property]) ? 0 : ((x[property] > y[property]) ? 1 : -1));
	};
};