import ProfilePage from "@/components/profile/ProfilePage";

export default function Profile() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-2xl font-bold text-white">Profile</h1>
      <ProfilePage />
    </div>
  );
}
