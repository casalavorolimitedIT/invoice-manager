import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WalkInGuestIndexPage() {
	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,_#fffdfb_0%,_#fff6ee_46%,_#fffaf7_100%)] px-4 py-10">
			<div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
				<Card className="w-full max-w-2xl border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(26,20,12,0.12)]">
					<CardHeader>
						<CardTitle className="text-3xl">Walk-in guest form link required</CardTitle>
						<CardDescription>
							Open the full guest form URL shared by the business unit, for example /walk-in-guest/your-slug.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button variant="outline" render={<Link href="/" />}>
							Back to home
						</Button>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
