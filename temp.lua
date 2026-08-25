-- $Id: testes/gc.lua $
-- See Copyright Notice in file lua.h

print('testing incremental garbage collection')

local debug = require"debug"

assert(collectgarbage("isrunning"))

collectgarbage()

local oldmode = collectgarbage("incremental")

-- changing modes should return previous mode
assert(collectgarbage("generational") == "incremental")
assert(collectgarbage("generational") == "generational")
assert(collectgarbage("incremental") == "generational")
assert(collectgarbage("incremental") == "incremental")


local function nop () end

local function gcinfo ()
  return collectgarbage"count" * 1024
end


-- test weird parameters to 'collectgarbage'
do
  collectgarbage("incremental")
  local opause = collectgarbage("param", "pause", 100)
  local ostepmul = collectgarbage("param", "stepmul", 100)
  assert(collectgarbage("param", "pause") == 100)
  assert(collectgarbage("param", "stepmul") == 100)
  local t = {0, 2, 10, 90, 500, 5000, 30000, 0x7ffffffe}
  for i = 1, #t do
    collectgarbage("param", "pause", t[i])
    for j = 1, #t do
      collectgarbage("param", "stepmul", t[j])
      collectgarbage("step", t[j])
    end
  end
  -- restore original parameters
  collectgarbage("param", "pause", opause)
  collectgarbage("param", "stepmul", ostepmul)
  collectgarbage()
end


--
-- test the "size" of basic GC steps (whatever they mean...)
--
do  print("steps")

  local function dosteps (siz)
    collectgarbage()
    local a = {}
    for i=1,100 do a[i] = {{}}; local b = {} end
    local x = gcinfo()
    local i = 0
    repeat   -- do steps until it completes a collection cycle
      i = i+1
    until collectgarbage("step", siz)
    assert(gcinfo() < x)
    return i    -- number of steps
  end


  if not _port then
    collectgarbage"stop"
    assert(dosteps(10) < dosteps(2))
    collectgarbage"restart"
  end

end


_G["while"] = 234


--
-- tests for GC activation when creating different kinds of objects
--
local function GC1 ()
  local u
  local b     -- (above 'u' it in the stack)
  local finish = false
  u = setmetatable({}, {__gc = function () finish = true end})
  b = {34}
  repeat u = {} until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not

  finish = false; local i = 1
  u = setmetatable({}, {__gc = function () finish = true end})
  repeat i = i + 1; u = tostring(i) .. tostring(i) until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not

  finish = false
  u = setmetatable({}, {__gc = function () finish = true end})
  repeat local i; u = function () return i end until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not
end

local function GC2 ()
  local u
  local finish = false
  u = {setmetatable({}, {__gc = function () finish = true end})}
  local b = {34}
  repeat u = {{}} until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not

  finish = false; local i = 1
  u = {setmetatable({}, {__gc = function () finish = true end})}
  repeat i = i + 1; u = {tostring(i) .. tostring(i)} until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not

  finish = false
  u = {setmetatable({}, {__gc = function () finish = true end})}
  repeat local i; u = {function () return i end} until finish
  assert(b[1] == 34)   -- 'u' was collected, but 'b' was not
end

local function GC()  GC1(); GC2() end


do
  print("creating many objects")

  local limit = 5000

  for i = 1, limit do
    local a = {}; a = nil
  end

  local a = "a"

  for i = 1, limit do
    a = i .. "b";
    a = string.gsub(a, '(%d%d*)', "%1 %1")
    a = "a"
  end



  a = {}

  function a:test ()
    for i = 1, limit do
      load(string.format("function temp(a) return 'a%d' end", i), "")()
      assert(temp() == string.format('a%d', i))
    end
  end

  a:test()
  _G.temp = nil
end