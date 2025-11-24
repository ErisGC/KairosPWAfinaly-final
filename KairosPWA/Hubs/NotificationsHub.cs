using Microsoft.AspNetCore.SignalR;
using System.Threading.Tasks;

namespace KairosPWA.Hubs
{
    public class NotificationsHub : Hub
    {
        // Puedes añadir métodos si quieres, pero para broadcast básico no hace falta
        public override Task OnConnectedAsync()
        {
            return base.OnConnectedAsync();
        }
    }
}