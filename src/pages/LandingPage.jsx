import PageHeader from '../components/PageHeader.jsx'



export default function LandingPage() {
    const usuario = {
        nombre: "Guido",
        apellido: "Bitti",

    }
    return (
        <>
        <PageHeader
            lineas={['Bienvenido', `${usuario.nombre} ${usuario.apellido}`]}
            bajada="Gestioná tus campañas, lotes e insumos y consultá la información clave de tu producción."
            dato={{
            rotulo: 'Agregar Logo empresa',
            }}
        />
        </>
    );
}