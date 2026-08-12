import { useState } from "react";

import { Plus, Search } from "lucide-react";

import PageContainer from "../../../../components/PageContainer/PageContainer";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Table,
} from "../../../../shared/ui";

const DashboardPage = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const columns = [
    {
      key: "name",
      title: "Mahsulot",
    },
    {
      key: "type",
      title: "Turi",
    },
    {
      key: "stock",
      title: "Qoldiq",
    },
    {
      key: "status",
      title: "Holat",

      render: (status) => (
        <Badge variant={status === "Faol" ? "success" : "warning"}>
          {status}
        </Badge>
      ),
    },
  ];

  const data = [
    {
      id: 1,
      name: "Test mahsulot",
      type: "Tayyor mahsulot",
      stock: "120 dona",
      status: "Faol",
    },
    {
      id: 2,
      name: "Xomashyo A",
      type: "Xomashyo",
      stock: "45 kg",
      status: "Kam qolgan",
    },
  ];

  return (
    <PageContainer
      title="Bosh sahifa"
      description="Neomorphism Design System test ko‘rinishi."
    >
      <div
        style={{
          display: "grid",
          gap: 24,
        }}
      >
        <Card>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <Button
              leftIcon={<Plus size={17} />}
              onClick={() => setModalOpen(true)}
            >
              Yangi yaratish
            </Button>

            <Button variant="secondary">Oddiy tugma</Button>

            <Button variant="danger">O‘chirish</Button>
          </div>
        </Card>

        <Card>
          <Input
            label="Qidiruv"
            placeholder="Mahsulot nomini kiriting..."
            leftIcon={<Search size={17} />}
          />
        </Card>

        <Table columns={columns} data={data} />

        <Card>
          <EmptyState
            title="Hozircha ma’lumot yo‘q"
            description="Yangi ma’lumot yaratganingizdan keyin shu yerda ko‘rinadi."
            actionLabel="Yaratish"
          />
        </Card>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Test modal"
        description="Neomorphism modal komponenti."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Bekor qilish
            </Button>

            <Button onClick={() => setModalOpen(false)}>Saqlash</Button>
          </>
        }
      >
        <Input label="Nomi" placeholder="Nom kiriting" />
      </Modal>
    </PageContainer>
  );
};

export default DashboardPage;
