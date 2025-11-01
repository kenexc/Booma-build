/*********
Purpose: Landing page for the Booma demo UI with polished fintech design.
Assumptions: Uses shadcn components for professional appearance.
*********/

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, CreditCard, Activity, Settings } from 'lucide-react';
import Link from 'next/link';

export default function Page() {
	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-4xl font-bold tracking-tight">Booma Backend Demo</h1>
				<p className="text-muted-foreground mt-2 text-lg">
					Modern fintech infrastructure for instant refund advances and collections
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<CreditCard className="h-5 w-5" />
							Refunds
						</CardTitle>
						<CardDescription>View and manage refund records</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/refunds">
							<Button className="w-full">
								View Refunds
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Activity className="h-5 w-5" />
							Test Console
						</CardTitle>
						<CardDescription>Create test charges and simulate flows</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/test">
							<Button variant="outline" className="w-full">
								Open Console
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Settings className="h-5 w-5" />
							API Health
						</CardTitle>
						<CardDescription>Check system status</CardDescription>
					</CardHeader>
					<CardContent>
						<a href="/api/health" target="_blank" rel="noreferrer">
							<Button variant="outline" className="w-full">
								Check Status
								<ArrowRight className="ml-2 h-4 w-4" />
							</Button>
						</a>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
