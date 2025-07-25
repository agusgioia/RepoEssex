import { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { ProgressSpinner } from 'primereact/progressspinner';
import { getUserContracts, deleteContract, formatDate } from '../Shared/FirebaseContrats';
import { enviarFormulario, generarCodigo } from '../Shared/EmailCode';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { showSuccess, showError } from '../Administrator/FirebaseSellers';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const Sellers = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useRef(null);

  const handleDelete = async (contractId) => {
    try {
      await deleteContract(contractId);
      setContracts(prev => prev.filter(contract => contract.id !== contractId));
      toast.current.show({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Contrato eliminado correctamente',
        life: 5000
      });
    } catch (error) {
      console.error("Error al eliminar contrato:", error);
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar el contrato',
        life: 5000
      });
    }
  };

  const statusBodyTemplate = (rowData) => {
    const severity = rowData.status === 'pendiente' ? 'warning' : rowData.status === 'activo' ? 'success' : 'danger';
    return <Tag value={rowData.status} severity={severity} />;
  };

  const actionCombinedTemplate = (rowData) => {
   return ( 
    <div className="accionesBotones">
      {(rowData.firmaUsuario && rowData.firmaVendedor && rowData.status === "activo")?(
          <Tag
            value="Firmado"
            severity="success"
            className="btn-accion btn-ver"
          />
        ):(rowData.firmaUsuario && rowData.firmaVendedor && rowData.status === "pendiente")?(
          <Button
            icon="pi pi-code"
            severity="p-button-secondary"
            className="btn-accion btn-ver"
            rounded
            outlined
            tooltip="Enviar código"
            onClick={async () => {
              try {
                await generarCodigo(rowData.id);
                const contractDoc = await getDoc(doc(db, "contracts", rowData.id));
                if (!contractDoc.exists()) {
                  showError("No se pudo obtener el contrato actualizado");
                  return;
                }
                const updatedContract = contractDoc.data();
                setContracts(prev =>
                  prev.map(c => (c.id === rowData.id ? { ...c, ...updatedContract } : c))
                );
                showSuccess("Código enviado correctamente");
              } catch (error) {
                showError(`Error al enviar el código: ${error.message}`);
              }
            }}
          />
        ):(
          <Button
            icon="pi pi-file-edit"
            severity="p-button-secondary"
            className="btn-accion btn-ver"
            rounded
            outlined
            tooltip="Enviar formulario"
            onClick={async () => {
              try {
                console.log("Enviando formulario para contrato:", rowData.id, rowData.email);
                await enviarFormulario(rowData.id, rowData.email);
              } catch (error) {
                showError(`Error al enviar el formulario: ${error.message}`);
              }
            }}
          />
        )  
      }

      <Button
        icon="pi pi-trash"
        className="btn-accion btn-pdf"
        severity="danger"
        rounded
        outlined
        tooltip="Eliminar contrato"
        onClick={() => handleDelete(rowData.id)}
      />
    </div>
    );
  };

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const contractsData = await getUserContracts();
        if (!contractsData || contractsData.length === 0) {
          showError("No se encontraron contratos para este usuario");
          return;
        }
        contractsData.forEach(contract => {
          contract.createdAt = formatDate(contract.createdAt);
          contract.fechaInicio = formatDate(contract.fechaInicio);
          contract.fechaFin = formatDate(contract.fechaFin);
        });

        console.log("Contratos cargados:", contractsData);
        setContracts(contractsData);
      } catch (error) {
        console.error("Error detallado:", error);
        showError(`Error al cargar contratos: ${error.message}`);
        setContracts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-content-center align-items-center min-h-screen bg-blue-50">
        <ProgressSpinner style={{ width: '60px', height: '60px' }} strokeWidth="4" />
      </div>
    );
  }

  return (
    <div className="surface-ground p-6 shadow-4 border-round-lg animate__animated animate__fadeIn" id='sellers'>
      <Toast ref={toast} />
      <div className="flex justify-content-between align-items-center mb-4">
        <h2 className="text-xl font-medium text-700">Mis Contratos</h2>
      </div>

      <DataTable
        value={contracts}
        dataKey="id"
        paginator
        rows={10}
        rowsPerPageOptions={[5, 10, 25]}
        className="w-full animate__animated animate__fadeInUp"
        emptyMessage="No se encontraron contratos"
        rowClassName={(rowData) => {
          const index = contracts.findIndex(c => c.id === rowData.id);
          return index % 2 === 0 ? 'fila-par' : 'fila-impar';
        }}
      >
        <Column field="titulo" header="Título" sortable headerClassName="font-medium" />
        <Column field="contenido" header="Contenido" sortable headerClassName="font-medium" />
        <Column field="status" header="Estado" sortable body={statusBodyTemplate} headerClassName="font-medium" />
        <Column field="email" header="Email del Cliente" sortable headerClassName="font-medium" />
        <Column header="Acciones" bodyClassName={'col-acciones'} body={actionCombinedTemplate} headerClassName="font-medium" />
      </DataTable>

    </div>
  );
};

export default Sellers;
