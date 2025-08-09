import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import { ToastContainer } from "react-toastify";
import * as serviceworker from './serviceWorker';
import App from "./App";

window.Buffer = Buffer;

ReactDOM.render(
	<>
		<CssBaseline />
		<App />
		<ToastContainer
			position="top-center"
			autoClose={3000}
			style={{ zIndex: 99999 }}
		/>
	</>,
	document.getElementById("root"),
	() => {
		window.finishProgress();
	}
);

serviceworker.register();
