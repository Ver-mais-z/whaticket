import React from "react";

import { makeStyles } from "@material-ui/core/styles";
import Container from "@material-ui/core/Container";

const useStyles = makeStyles(theme => ({
	mainContainer: (props) => ({
		flex: 1,
		padding: theme.spacing(2),
		// quando não estiver usando o scroll da janela, mantemos a altura fixa
		...(props && props.useWindowScroll ? {} : { height: `calc(100% - 48px)` }),
	}),

	contentWrapper: (props) => ({
		display: "flex",
		flexDirection: "column",
		// quando não estiver usando o scroll da janela, aplicamos o overflow interno
		...(props && props.useWindowScroll ? {} : { height: "100%", overflowY: "auto" }),
	}),
}));

const MainContainer = ({ children, useWindowScroll = false }) => {
	const classes = useStyles({ useWindowScroll });

	return (
		<Container className={classes.mainContainer}>
			<div className={classes.contentWrapper}>{children}</div>
		</Container>
	);
};

export default MainContainer;
