local ls = require("luasnip")

-- some shorthands...
local snip = ls.snippet
local node = ls.snippet_node
local text = ls.text_node
local insert = ls.insert_node
local func = ls.function_node
local choice = ls.choice_node
local dynamicn = ls.dynamic_node
local i = ls.insert_node
local s = ls.snippet

ls.config.set_config({
  history = true, -- keep around last snippet local to jump back
  enable_autosnippets = true,
})

-- Make sure to not pass an invalid command, as io.popen() may write over nvim-text.
local function bash(_, _, command)
  local file = io.popen(command, "r")
  local res = {}
  for line in file:lines() do
    table.insert(res, line)
  end
  return res
end

ls.add_snippets(nil, {
  terraform = {

    snip("us-east-1", { text { "us-east-1" }, insert(0), }),
    snip("us-west-1", { text { "us-west-1" }, insert(0), }),
    snip("eu-central-1", { text { "eu-central-1" }, insert(0), }),
    snip("ap-northeast-1", { text { "ap-northeast-1" }, insert(0), }),
    snip("ap-southeast-1", { text { "ap-southeast-1" }, insert(0), }),

    snip("ec2", {
      text {
        'module "ec2" {', "", "}",
      },
      insert(0),
    }),

    snip("shebang", {
      text {
        "#! terraform", "",
      },
      insert(0),
    }),

    snip({
      trig = "example",
      name = "example",
      dscr = "Grab an example",
    }, {
      func(bash, {}, { user_args = { "cat ~/oneTakeda/terraform-aws-TakedaEC2/examples/main.tf" } }),
    }),

    s(
      {
        trig = "region",
        name = "var.region",
        dscr = "region"
      }, {
        i(1, 'region = "'),
        i(2, 'var.region'),
        i(3, '"'),
      }),
  },
})
