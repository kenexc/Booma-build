/*********
Purpose: Landing page for the Booma demo UI - redirects to test console.
Assumptions: Simple landing page focusing on the test console.
*********/

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';

export default function Page() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-3xl md:text-4xl font-bold tracking-tight">Booma Demo Console</h1>
				<p className="text-muted-foreground mt-2 text-base md:text-lg">
					Modern fintech infrastructure for instant refund advances and collections
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Activity className="h-5 w-5" />
						Test Console
					</CardTitle>
					<CardDescription>Create test charges, refund them, and simulate the complete refund flow</CardDescription>
				</CardHeader>
				<CardContent>
					<Link href="/test">
						<Button className="w-full md:w-auto">
							Open Console
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</Link>
				</CardContent>
			</Card>
		</div>
	);
}
