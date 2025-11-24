using KairosPWA.DTOs;
using KairosPWA.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace KairosPWA.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TurnsController : ControllerBase
    {
        private readonly TurnService _turnService;

        public TurnsController(TurnService turnService)
        {
            _turnService = turnService;
        }

        // GET: api/Turns
        [HttpGet]
        public async Task<ActionResult<IEnumerable<TurnDTO>>> GetTurns()
        {
            var turns = await _turnService.GetAllTurnsAsync();
            return Ok(turns);
        }

        // POST: api/Turns  (uso interno: admin/empleado crea turnos manualmente si se necesita)
        [HttpPost]
        [Authorize(Roles = "Administrador,Empleado")]
        public async Task<ActionResult<TurnDTO>> PostTurn([FromBody] TurnCreateDTO turnDto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var createdTurn = await _turnService.CreateTurnAsync(turnDto);
                return Ok(createdTurn);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST api/turns/public  (cliente público pide turno por documento + nombre)
        [HttpPost("public")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(TurnDTO), 200)]
        public async Task<IActionResult> CreatePublicTurn([FromBody] PublicTurnCreateDTO dto)
        {
            try
            {
                var created = await _turnService.CreatePublicTurnAsync(dto);
                return Ok(created);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // POST api/turns/public/cancel
        [HttpPost("public/cancel")]
        [AllowAnonymous]
        public async Task<IActionResult> CancelPublicTurn([FromBody] PublicTurnCancelDTO dto)
        {
            var result = await _turnService.CancelPublicTurnAsync(dto);
            if (!result)
                return NotFound(new { message = "No se encontró un turno pendiente para ese cliente/servicio." });

            return Ok(new { message = "Turno cancelado correctamente." });
        }

        // GET api/turns/service/{serviceId}/summary
        [HttpGet("service/{serviceId}/summary")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ServiceQueueSummaryDTO), 200)]
        public async Task<IActionResult> GetServiceSummary(int serviceId)
        {
            var summary = await _turnService.GetServiceQueueSummaryAsync(serviceId);
            return Ok(summary);
        }

        // POST api/turns/service/{serviceId}/advance
        // Empleado/Admin marcan turno como atendido y pasan al siguiente
        [HttpPost("service/{serviceId}/advance")]
        [Authorize(Roles = "Administrador,Empleado")]
        public async Task<IActionResult> AdvanceTurnByService(int serviceId)
        {
            // Sacar el Id del usuario autenticado del token
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !int.TryParse(userIdClaim.Value, out var userId))
            {
                return Unauthorized(new { message = "No se pudo determinar el usuario actual." });
            }

            var nextTurn = await _turnService.AdvanceTurnByServiceAsync(serviceId, userId);

            if (nextTurn == null)
                return Ok(new { message = "No hay más turnos pendientes para este servicio." });

            return Ok(nextTurn);
        }
    }
}
