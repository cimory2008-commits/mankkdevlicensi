// Generator script Lua. Bagian lisensi selalu dibuat server; user hanya mengisi "custom code".
const q = s => '"' + String(s)
  .replace(/[\\"]/g, '\\$&')
  .replace(/\r/g, '')
  .replace(/\n/g, '\\n')
  .replace(/[^\x20-\x7e]/g, c => '\\u{' + c.codePointAt(0).toString(16) + '}') + '"';

function buildLua({ apiUrl, key, username, config, code }) {
  return `--[[
  4Mankkdev License System
  Akun : ${String(username).replace(/[^a-z0-9_]/g, '')}

  CARA PAKAI:
  1. Taruh sebagai Script (bukan LocalScript) di ServerScriptService
  2. Game Settings > Security > Allow HTTP Requests = ON
  3. Publish game (Universe ID baru terbaca setelah game dipublish)
  4. Daftarkan Universe ID game di dashboard website
]]

local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

local API_URL = ${q(apiUrl)}
local LICENSE_KEY = ${q(key)}
local CHECK_INTERVAL = 300 -- detik, cek ulang lisensi berkala

-- Config awal (otomatis diperbarui dari website saat game berjalan)
local Config = {
	HubName = ${q(config.hubName)},
	LogoId = ${q(config.logoId)},
	Accent = ${q(config.accent)},
	LockTitle = ${q(config.lockTitle)},
	LockMessage = ${q(config.lockMessage.replace(/\{name\}/g, config.hubName))},
}

local Mankk = { Licensed = false, Config = Config }
local locked = true
local lockReason = "Memverifikasi lisensi..."
local started = false

local function hexColor(hex)
	local ok, c = pcall(Color3.fromHex, hex)
	return ok and c or Color3.fromRGB(110, 168, 255)
end

local function applyRemote(c)
	if type(c) ~= "table" then return end
	if c.hubName then Config.HubName = c.hubName end
	if c.logoId then Config.LogoId = tostring(c.logoId) end
	if c.accent then Config.Accent = c.accent end
	if c.lockTitle then Config.LockTitle = c.lockTitle end
	if c.lockMessage then Config.LockMessage = c.lockMessage end
end

----------------------------------------------------------------
-- UI "Akses Ditolak" (tampil saat Universe ID belum terverifikasi)
----------------------------------------------------------------
local function newText(parent, y, h, text, size, color, font)
	local t = Instance.new("TextLabel")
	t.BackgroundTransparency = 1
	t.AnchorPoint = Vector2.new(0.5, 0)
	t.Position = UDim2.new(0.5, 0, 0, y)
	t.Size = UDim2.new(1, -40, 0, h)
	t.Text = text
	t.TextSize = size
	t.TextColor3 = color
	t.Font = font
	t.TextWrapped = true
	t.Parent = parent
	return t
end

local function buildLockGui()
	local accent = hexColor(Config.Accent)

	local gui = Instance.new("ScreenGui")
	gui.Name = "MankkLock"
	gui.ResetOnSpawn = false
	gui.IgnoreGuiInset = true
	gui.DisplayOrder = 2147483647
	gui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

	local bg = Instance.new("Frame")
	bg.Size = UDim2.fromScale(1, 1)
	bg.BackgroundColor3 = Color3.fromRGB(9, 9, 13)
	bg.BackgroundTransparency = 0.05
	bg.BorderSizePixel = 0
	bg.Active = true
	bg.Parent = gui

	local card = Instance.new("Frame")
	card.AnchorPoint = Vector2.new(0.5, 0.5)
	card.Position = UDim2.fromScale(0.5, 0.5)
	card.Size = UDim2.new(0.9, 0, 0, 340)
	card.BackgroundColor3 = Color3.fromRGB(22, 22, 30)
	card.BorderSizePixel = 0
	card.Parent = bg
	Instance.new("UICorner", card).CornerRadius = UDim.new(0, 14)
	local stroke = Instance.new("UIStroke", card)
	stroke.Color = accent
	stroke.Thickness = 2
	local limit = Instance.new("UISizeConstraint", card)
	limit.MaxSize = Vector2.new(440, 340)

	local logo = Instance.new("ImageLabel")
	logo.BackgroundTransparency = 1
	logo.AnchorPoint = Vector2.new(0.5, 0)
	logo.Position = UDim2.new(0.5, 0, 0, 20)
	logo.Size = UDim2.fromOffset(84, 84)
	logo.ScaleType = Enum.ScaleType.Fit
	logo.Image = "rbxassetid://" .. tostring(Config.LogoId)
	logo.Parent = card

	newText(card, 112, 30, Config.LockTitle, 24, accent, Enum.Font.GothamBlack)
	newText(card, 150, 100, lockReason, 15, Color3.fromRGB(190, 192, 205), Enum.Font.Gotham)
	newText(card, 262, 20, "Universe ID: " .. tostring(game.GameId), 13, Color3.fromRGB(130, 132, 148), Enum.Font.Code)
	newText(card, 300, 20, "Powered by 4Mankkdev", 12, Color3.fromRGB(110, 112, 128), Enum.Font.GothamMedium)

	return gui
end

local function showLock(plr)
	local pg = plr:FindFirstChildOfClass("PlayerGui")
	if not pg then return end
	local old = pg:FindFirstChild("MankkLock")
	if old then old:Destroy() end
	buildLockGui().Parent = pg
end

local function hideLock(plr)
	local pg = plr:FindFirstChildOfClass("PlayerGui")
	local g = pg and pg:FindFirstChild("MankkLock")
	if g then g:Destroy() end
end

----------------------------------------------------------------
-- Freeze player (dijalankan di server, tidak bisa di-bypass client)
----------------------------------------------------------------
local function freeze(plr)
	local char = plr.Character
	if not char then return end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if hum then
		if hum:GetAttribute("MankkWS") == nil then
			hum:SetAttribute("MankkWS", hum.WalkSpeed)
			hum:SetAttribute("MankkJP", hum.JumpPower)
			hum:SetAttribute("MankkJH", hum.JumpHeight)
		end
		hum.WalkSpeed = 0
		hum.JumpPower = 0
		hum.JumpHeight = 0
	end
	if root then root.Anchored = true end
end

local function unfreeze(plr)
	local char = plr.Character
	if not char then return end
	local hum = char:FindFirstChildOfClass("Humanoid")
	local root = char:FindFirstChild("HumanoidRootPart")
	if hum and hum:GetAttribute("MankkWS") ~= nil then
		hum.WalkSpeed = hum:GetAttribute("MankkWS")
		hum.JumpPower = hum:GetAttribute("MankkJP")
		hum.JumpHeight = hum:GetAttribute("MankkJH")
		hum:SetAttribute("MankkWS", nil)
		hum:SetAttribute("MankkJP", nil)
		hum:SetAttribute("MankkJH", nil)
	end
	if root then root.Anchored = false end
end

local function setLocked(state, reason)
	locked = state
	Mankk.Licensed = not state
	if reason then lockReason = reason end
	for _, plr in ipairs(Players:GetPlayers()) do
		if state then
			showLock(plr)
			freeze(plr)
		else
			hideLock(plr)
			unfreeze(plr)
		end
	end
end

local function track(plr)
	plr.CharacterAdded:Connect(function(char)
		char:WaitForChild("Humanoid")
		char:WaitForChild("HumanoidRootPart")
		if locked then freeze(plr) end
	end)
	task.spawn(function()
		plr:WaitForChild("PlayerGui")
		if locked then showLock(plr) end
	end)
end

----------------------------------------------------------------
-- Verifikasi ke website
----------------------------------------------------------------
local function check()
	local url = API_URL .. "/api/verify?key=" .. HttpService:UrlEncode(LICENSE_KEY) .. "&universe=" .. tostring(game.GameId)
	local ok, res = pcall(HttpService.GetAsync, HttpService, url)
	if not ok then
		if tostring(res):find("Http requests are not enabled") then
			return false, "HTTP Requests belum aktif. Aktifkan di Game Settings > Security > Allow HTTP Requests."
		end
		return false, "Tidak bisa menghubungi server lisensi. Mencoba lagi..."
	end
	local ok2, data = pcall(HttpService.JSONDecode, HttpService, res)
	if not ok2 or type(data) ~= "table" then
		return false, "Respon server lisensi tidak valid."
	end
	applyRemote(data.config)
	return data.ok == true, data.message
end

----------------------------------------------------------------
-- KODE CUSTOM (diedit lewat website) - jalan hanya jika terverifikasi
----------------------------------------------------------------
local function onVerified(Mankk)
${String(code).replace(/\r/g, '').split('\n').map(l => '\t' + l).join('\n')}
end

----------------------------------------------------------------
-- Main
----------------------------------------------------------------
for _, p in ipairs(Players:GetPlayers()) do track(p) end
Players.PlayerAdded:Connect(track)
setLocked(true, lockReason)

task.spawn(function()
	while true do
		local ok, msg = check()
		if ok then
			setLocked(false)
			if not started then
				started = true
				task.spawn(onVerified, Mankk)
			end
		else
			setLocked(true, msg or Config.LockMessage)
		end
		task.wait(ok and CHECK_INTERVAL or 20)
	end
end)
`;
}

module.exports = { buildLua };
