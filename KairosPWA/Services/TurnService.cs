using AutoMapper;
using Humanizer;
using KairosPWA.Data;
using KairosPWA.DTOs;
using KairosPWA.Enums;
using KairosPWA.Hubs;
using KairosPWA.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace KairosPWA.Services
{
    public class TurnService
    {
        private readonly ConnectionContext _context;
        private readonly IMapper _mapper;
        private readonly IHubContext<NotificationsHub> _hubContext;
        private readonly UserService _userService;
        public TurnService(ConnectionContext context, IMapper mapper, IHubContext<NotificationsHub> hubContext, UserService userService)
        {
            _context = context;
            _mapper = mapper;
            _hubContext = hubContext;
            _userService = userService;
        }

        public async Task<TurnDTO> CreateTurnAsync(TurnCreateDTO turnCreateDto)
        {
            var client = await _context.Clients.FindAsync(turnCreateDto.ClientId);
            var service = await _context.Services.FindAsync(turnCreateDto.ServiceId);

            if (client == null || service == null)
                throw new Exception("Cliente o servicio no encontrado.");

            var turnEntidad = _mapper.Map<Turn>(turnCreateDto);
            turnEntidad.FechaHora = DateTime.Now;

            if (string.IsNullOrWhiteSpace(turnEntidad.State))
            {
                turnEntidad.State = TurnState.Pendiente.ToString();
            }

            _context.Turns.Add(turnEntidad);
            await _context.SaveChangesAsync();

            await _context.Entry(turnEntidad).Reference(t => t.Client).LoadAsync();
            await _context.Entry(turnEntidad).Reference(t => t.Service).LoadAsync();

            return _mapper.Map<TurnDTO>(turnEntidad);
        }
        public async Task<TurnDTO> CreatePublicTurnAsync(PublicTurnCreateDTO dto)
        {
            // 1. Validar servicio
            var service = await _context.Services.FindAsync(dto.ServiceId);
            if (service == null)
                throw new Exception("Servicio no encontrado.");

            // 2. Buscar o crear cliente por documento
            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == dto.ClientDocument);

            if (client == null)
            {
                client = new Client
                {
                    Id = dto.ClientDocument,
                    Name = dto.ClientName,
                    State = "Activo"
                };

                _context.Clients.Add(client);
                await _context.SaveChangesAsync();
            }
            else
            {
                // Actualiza nombre si ha cambiado
                if (!string.Equals(client.Name, dto.ClientName, StringComparison.OrdinalIgnoreCase))
                {
                    client.Name = dto.ClientName;
                    await _context.SaveChangesAsync();
                }
            }

            // 3. Validar que NO tenga turno pendiente en ese servicio
            bool yaTieneTurnoPendiente = await _context.Turns.AnyAsync(t =>
                t.ClientId == client.IdClient &&
                t.ServiceId == dto.ServiceId &&
                t.State == TurnState.Pendiente.ToString());

            if (yaTieneTurnoPendiente)
                throw new Exception("Ya tienes un turno pendiente para este servicio.");

            // 4. Calcular el siguiente número de turno para ese servicio
            int ultimoNumero = await _context.Turns
                .Where(t => t.ServiceId == dto.ServiceId)
                .Select(t => (int?)t.Number)
                .MaxAsync() ?? 0;

            int nuevoNumero = ultimoNumero + 1;

            var turnEntidad = new Turn
            {
                Number = nuevoNumero,
                FechaHora = DateTime.Now,
                State = TurnState.Pendiente.ToString(),
                ClientId = client.IdClient,
                ServiceId = dto.ServiceId
            };

            _context.Turns.Add(turnEntidad);
            await _context.SaveChangesAsync();

            // Cargar navegación
            await _context.Entry(turnEntidad).Reference(t => t.Client).LoadAsync();
            await _context.Entry(turnEntidad).Reference(t => t.Service).LoadAsync();
            await _hubContext.Clients.All.SendAsync("TurnUpdated", new
            {
                serviceId = dto.ServiceId
            });
            return _mapper.Map<TurnDTO>(turnEntidad);
        }
        public async Task<bool> CancelPublicTurnAsync(PublicTurnCancelDTO dto)
        {
            // Buscar el cliente por documento
            var client = await _context.Clients
                .FirstOrDefaultAsync(c => c.Id == dto.ClientDocument);

            if (client == null)
                return false;

            // Buscar turno pendiente de ese cliente en ese servicio
            var turn = await _context.Turns.FirstOrDefaultAsync(t =>
                t.ClientId == client.IdClient &&
                t.ServiceId == dto.ServiceId &&
                t.State == TurnState.Pendiente.ToString());

            if (turn == null)
                return false;

            // Opción A: marcar como cancelado
            turn.State = TurnState.Cancelado.ToString();
            await _context.SaveChangesAsync();
            await _hubContext.Clients.All.SendAsync("TurnUpdated", new
            {
                serviceId = dto.ServiceId
            });
            return true;
        }
        public async Task<ServiceQueueSummaryDTO> GetServiceQueueSummaryAsync(int serviceId)
        {
            // Turno actual (el de menor número pendiente)
            var currentTurn = await _context.Turns
                .Where(t => t.ServiceId == serviceId && t.State == TurnState.Pendiente.ToString())
                .OrderBy(t => t.Number)
                .FirstOrDefaultAsync();

            int? currentNumber = currentTurn?.Number;

            int lastNumber = await _context.Turns
                .Where(t => t.ServiceId == serviceId)
                .Select(t => (int?)t.Number)
                .MaxAsync() ?? 0;

            int pendingCount = await _context.Turns
                .CountAsync(t => t.ServiceId == serviceId && t.State == TurnState.Pendiente.ToString());


            return new ServiceQueueSummaryDTO
            {
                ServiceId = serviceId,
                CurrentNumber = currentNumber,
                LastNumber = lastNumber,
                PendingCount = pendingCount
            };
        }

        public async Task<List<TurnDTO>> GetAllTurnsAsync()
        {
            var turns = await _context.Turns
                .Include(t => t.Client)
                .Include(t => t.Service)
                .ToListAsync();
            return _mapper.Map<List<TurnDTO>>(turns);
        }

        public async Task<List<TurnDTO>> GetPendingTurnsByServiceAsync(int serviceId)
        {
            var turns = await _context.Turns
                .Include(t => t.Client)
                .Include(t => t.Service)
                .Where(t => t.ServiceId == serviceId && t.State == "Pendiente")
                .OrderBy(t => t.Number)
                .ToListAsync();
            return _mapper.Map<List<TurnDTO>>(turns);
        }

        public async Task<TurnDTO?> GetCurrentPendingTurnByServiceAsync(int serviceId)
        {
            var turn = await _context.Turns
                .Include(t => t.Client)
                .Include(t => t.Service)
                .Where(t => t.ServiceId == serviceId && t.State == "Pendiente")
                .OrderBy(t => t.Number)
                .FirstOrDefaultAsync();

            return turn != null ? _mapper.Map<TurnDTO>(turn) : null;
        }

        public async Task<bool> DeleteTurnAsync(int id)
        {
            var turn = await _context.Turns.FindAsync(id);
            if (turn == null) return false;
            _context.Turns.Remove(turn);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateTurnAsync(int id, TurnCreateDTO updatedTurn)
        {
            var turn = await _context.Turns.FindAsync(id);
            if (turn == null) return false;

            if (!string.IsNullOrWhiteSpace(updatedTurn.State))
            {
                if (!Enum.TryParse<TurnState>(updatedTurn.State, ignoreCase: true, out var stateEnum))
                {
                    throw new ArgumentException("Estado de turno inválido.");
                }

                turn.State = stateEnum.ToString();
            }

            turn.ClientId = updatedTurn.ClientId;
            turn.ServiceId = updatedTurn.ServiceId;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<TurnDTO?> AdvanceTurnByServiceAsync(int serviceId, int userId)
        {
            var pendingState = TurnState.Pendiente.ToString();
            var attendedState = TurnState.Atendido.ToString();

            var turnToAttend = await _context.Turns
                .Where(t => t.State == pendingState && t.ServiceId == serviceId)
                .OrderBy(t => t.Number)
                .FirstOrDefaultAsync();

            if (turnToAttend == null)
                return null;

            turnToAttend.State = attendedState;
            await _context.SaveChangesAsync();

            await _userService.RegisterManagedTurnAsync(userId, serviceId);

            var nextTurn = await _context.Turns
                .Include(t => t.Client)
                .Include(t => t.Service)
                .Where(t => t.State == pendingState && t.ServiceId == serviceId)
                .OrderBy(t => t.Number)
                .FirstOrDefaultAsync();
            await _hubContext.Clients.All.SendAsync("TurnUpdated", new
            {
                serviceId = serviceId
            });
            return nextTurn != null ? _mapper.Map<TurnDTO>(nextTurn) : null;
        }

        public async Task<bool> ChangeTurnStateAsync(int id, string newState)
        {
            var turn = await _context.Turns.FindAsync(id);
            if (turn == null) return false;

            if (!Enum.TryParse<TurnState>(newState, ignoreCase: true, out var stateEnum))
            {
                throw new ArgumentException("Estado de turno inválido.");
            }

            turn.State = stateEnum.ToString();
            await _context.SaveChangesAsync();
            return true;
        }
    }
}
