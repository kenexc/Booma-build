/*********
Purpose: App layout wrapper for Booma demo UI.
Assumptions: Minimal styling and navigation links.
*********/

export const metadata = {
	title: 'Booma Admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body style={{ fontFamily: 'system-ui, sans-serif', margin: 0 }}>
				<header style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
					<a href="/" style={{ fontWeight: 600, marginRight: 16 }}>Booma</a>
					<a href="/refunds">Refunds</a>
				</header>
				<main style={{ padding: 16 }}>{children}</main>
			</body>
		</html>
	);
}
