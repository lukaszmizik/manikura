"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { getPublicPhotoUrl } from "@/lib/storage";
import { setPhotoPublic } from "@/app/dashboard/my-photos/actions";

type Props = {
  id: string;
  storagePath: string;
  public: boolean;
};

export function PhotoPublicToggle({ id, storagePath, public: isPublic }: Props) {
  const router = useRouter();
  const imageUrl = getPublicPhotoUrl(storagePath);

  async function handleToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.checked;
    const { error } = await setPhotoPublic(id, next);
    if (error) {
      alert(error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl overflow-hidden border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/50">
      <div className="relative aspect-square bg-primary-100 dark:bg-primary-900">
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="200px"
        />
      </div>
      <label className="flex items-center gap-2 p-3 border-t border-primary-100 dark:border-primary-800 cursor-pointer">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={handleToggle}
          className="rounded border-primary-300 text-primary-600 focus:ring-primary-500 dark:border-primary-600 dark:bg-primary-900"
        />
        <span className="text-sm font-medium text-primary-800 dark:text-primary-200">
          Zveřejnit v galerii
        </span>
      </label>
    </div>
  );
}
