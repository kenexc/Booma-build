/*********
Purpose: App layout wrapper for Booma demo UI with shadcn styling.
Assumptions: Uses Tailwind CSS and shadcn components for polished fintech design.
*********/

import './globals.css';

export const metadata = {
	title: 'Booma Admin',
	description: 'Fintech backend management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
					<div className="container flex h-16 items-center space-x-4 px-6">
						<a href="/" className="text-lg font-semibold tracking-tight">
							Booma
						</a>
						<nav className="flex items-center space-x-6">
							<a href="/refunds" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
								Refunds
							</a>
							<a href="/test" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
								Test Console
							</a>
						</nav>
					</div>
				</header>
				<main className="container mx-auto px-6 py-8">{children}</main>
			</body>
		</html>
	);
}
