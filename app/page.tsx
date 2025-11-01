/*********
Purpose: Landing page for the Booma demo UI.
Assumptions: Simple content with links to key pages.
*********/

export default function Page() {
	return (
		<div>
			<h1>Booma Backend Demo</h1>
			<p>This UI is a thin wrapper over the API to showcase the core flows.</p>
			<ul>
				<li><a href="/refunds">View Refunds</a></li>
				<li><a href="/api/health" target="_blank" rel="noreferrer">API Health</a></li>
			</ul>
		</div>
	);
}
