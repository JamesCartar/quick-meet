import type { Participant } from '@meet/contracts/meeting';
import { Camera, CameraOff, Mic, MicOff, Search, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar, AvatarFallback } from '@/shared/components/ui/avatar';
import { Input } from '@/shared/components/ui/input';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/shared/components/ui/sheet';

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	participants: Participant[];
	selfId?: string;
};

function initials(name: string) {
	return name
		.split(/\s+/)
		.map((part) => part[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}

export function ParticipantsSheet({
	open,
	onOpenChange,
	participants,
	selfId,
}: Props) {
	const [search, setSearch] = useState('');
	const filteredParticipants = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return participants;
		return participants.filter((participant) =>
			participant.displayName.toLowerCase().includes(query),
		);
	}, [participants, search]);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="dark h-svh max-h-svh w-screen max-w-none rounded-none border-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-md sm:rounded-l-xl sm:border-l">
				<SheetHeader className="border-b px-6 py-5 pr-14">
					<SheetTitle className="flex items-center gap-2 text-lg">
						<Users className="size-5" />
						Participants ({participants.length})
					</SheetTitle>
				</SheetHeader>
				<div className="flex min-h-0 flex-1 flex-col gap-4 px-6 py-4">
					<div className="relative">
						<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Search participants"
							aria-label="Search participants"
							className="pl-9"
						/>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">
						{filteredParticipants.length > 0 ? (
							<ul className="space-y-1">
								{filteredParticipants.map((participant) => {
									const isSelf = participant.id === selfId;
									return (
										<li
											key={participant.id}
											className="flex items-center gap-3 rounded-lg py-3"
										>
											<Avatar>
												<AvatarFallback>
													{initials(participant.displayName)}
												</AvatarFallback>
											</Avatar>
											<span className="min-w-0 flex-1 truncate font-medium">
												{participant.displayName}
												{isSelf && (
													<span className="ml-1 font-normal text-muted-foreground">
														(you)
													</span>
												)}
											</span>
											<span className="flex shrink-0 items-center gap-3 text-muted-foreground">
												{participant.microphoneEnabled ? (
													<Mic aria-label="Microphone on" className="size-4" />
												) : (
													<MicOff
														aria-label="Microphone off"
														className="size-4 text-destructive"
													/>
												)}
												{participant.cameraEnabled ? (
													<Camera aria-label="Camera on" className="size-4" />
												) : (
													<CameraOff
														aria-label="Camera off"
														className="size-4 text-destructive"
													/>
												)}
											</span>
										</li>
									);
								})}
							</ul>
						) : (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No participants found.
							</p>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
