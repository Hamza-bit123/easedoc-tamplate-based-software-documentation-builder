import Layout from "../components/Layout";

const AdminDashboard = () => {
  return (
    <Layout>
      <h2 className="font-bold text-blue-600 underline text-9xl">
        Admin Dashboard
      </h2>

      <p className="text-3xl font-bold text-blue-600 underline">
        Welcome to admin panel
      </p>

      {/* Later: stats, charts */}
    </Layout>
  );
};

export default AdminDashboard;
