namespace KairosPWA.DTOs
{
    public class PublicTurnCreateDTO
    {
        // Documento del cliente (cédula, etc.)
        public string ClientDocument { get; set; } = string.Empty;

        // Nombre del cliente
        public string ClientName { get; set; } = string.Empty;

        // Servicio al que se va a pedir turno
        public int ServiceId { get; set; }
    }
}