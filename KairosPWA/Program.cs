using KairosPWA.Data;
using KairosPWA.JWT;
using KairosPWA.MappingProfiles;
using KairosPWA.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Claims;
using KairosPWA.Middleware;
using KairosPWA.Hubs;
using KairosPWA.Enums;
using KairosPWA.Models;

var builder = WebApplication.CreateBuilder(args);

// Validar clave JWT
var jwtKey = builder.Configuration["JwtSettings:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetBytes(jwtKey).Length < 32)
{
    throw new InvalidOperationException("JwtSettings:Key no configurada o demasiado corta. Usa user-secrets o variable de entorno con al menos 32 bytes.");
}

// DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddDbContext<ConnectionContext>(options =>
    options.UseSqlServer(connectionString));

// AutoMapper
builder.Services.AddAutoMapper(typeof(UserProfile), typeof(TurnProfile));

// Servicios de dominio
builder.Services.AddScoped<JwtTokenGenerator>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RolService>();
builder.Services.AddScoped<ServiceService>();
builder.Services.AddScoped<TurnService>();
builder.Services.AddScoped<ClientService>();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (incluyo 3000 y 5173 por si usas Vite o CRA)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                  "http://localhost:3000",
                  "http://192.168.229.201:3000",
                  "http://localhost:5173",
                  "http://192.168.229.201:5173"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Autenticación JWT
var jwtkey = builder.Configuration["JwtSettings:Key"];

builder.Services
    .AddAuthentication("Bearer")
    .AddJwtBearer("Bearer", options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["JwtSettings:Issuer"],
            ValidAudience = builder.Configuration["JwtSettings:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtkey)),
            RoleClaimType = ClaimTypes.Role,
            NameClaimType = ClaimTypes.NameIdentifier
        };
    });

builder.Services.AddAuthorization();

// Healthchecks
builder.Services.AddHealthChecks();

// SignalR
builder.Services.AddSignalR();

var app = builder.Build();

// Pipeline HTTP
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/error");
    app.UseHsts();
}

app.MapHealthChecks("/health");

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();
//app.UseMiddleware<RoleMiddleware>();
app.MapControllers();

app.MapHub<NotificationsHub>("/Hubs/NotificationsHub");

// 🔹 SEED DATOS INICIALES (sin borrar la BD)
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<ConnectionContext>();

        // Crea la BD y tablas si aún no existen (no borra nada)
        context.Database.EnsureCreated();

        // Rol Administrador
        var adminRole = context.Rols.FirstOrDefault(r => r.Name == "Administrador");
        if (adminRole == null)
        {
            adminRole = new Rol
            {
                Name = "Administrador",
                Permission = "Acceso total al sistema: usuarios, servicios, turnos y reportes."
            };
            context.Rols.Add(adminRole);
            context.SaveChanges();
        }

        // Rol Empleado
        if (!context.Rols.Any(r => r.Name == "Empleado"))
        {
            context.Rols.Add(new Rol
            {
                Name = "Empleado",
                Permission = "Gestión de turnos y atención al cliente."
            });
            context.SaveChanges();
        }

        // Usuario admin
        if (!context.Users.Any(u => u.UserName == "admin"))
        {
            var adminUser = new User
            {
                Name = "admin",
                UserName = "admin",
                Password = BCrypt.Net.BCrypt.HashPassword("Admin123*"),
                State = UserState.Activo.ToString(),
                RolId = adminRole.IdRol
            };

            context.Users.Add(adminUser);
            context.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Error al ejecutar el seeding de datos iniciales (admin/roles).");
    }
}

app.Run();
