/*********
Purpose: App layout wrapper for Booma demo UI with shadcn styling and mobile optimization.
Assumptions: Uses Tailwind CSS and shadcn components for polished fintech design.
*********/

import './globals.css';

export const metadata = {
	title: 'Booma Demo Console',
	description: 'Fintech backend demo and testing console',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
					<div className="container flex h-14 md:h-16 items-center justify-between px-4 md:px-6">
						<a href="/" className="text-base md:text-lg font-semibold tracking-tight">
							Booma
						</a>
					</div>
				</header>
				<main className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">{children}</main>
			</body>
		</html>
	);
}
