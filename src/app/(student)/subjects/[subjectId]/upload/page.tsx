import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ subjectId: string }>;
};

export default async function UploadPage({ params }: Props) {
  const { subjectId } = await params;
  redirect(`/upload?subject=${encodeURIComponent(subjectId)}`);
}
