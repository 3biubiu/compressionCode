<template>
    <card class="my-add-list" :padding="16">
        <div id="toway-tree" class="intellectual-property" xmlns="http://www.w3.org/1999/xhtml">

            <tis-button v-if = "!isSvgFullScreen" type="default" @click="svgFullScreen()">全屏</tis-button>
            <tis-button v-if = "isSvgFullScreen" type="default" @click="exitScreen()">退出</tis-button>

        </div>
        <!-- <div>
            <router-link to="/">Go to Home</router-link>
            <router-link to="/about" target="_blank"  >Go to About</router-link>
        </div> -->

    </card>
</template>
<script>
import utils from '@/utils.js';
import fullScreen from "@/full_screen.js"
import Cookies from 'js-cookie';

import $api from "@/api/index.js";
import * as d3 from 'd3';
import $ from 'jquery'
import ApplyCard from "@/components/apply_card/ApplyCard";
import TwiceConfirm from "@/components/twice_confirm/TwiceConfirm.vue";
import ListSort from "@/components/list_sort/ListSort.vue"
import Cookie from "js-cookie";
import Card from '../../../../components/card/Card.vue';
export default {
    name: '',
    components: {
        ApplyCard,
        TwiceConfirm,
        ListSort,
        Card
    },
    props: {
        //表格数据
        listData: {
            type: Object,
            default: () => {
                return {}
            }
        },
        // //数据总数
        tableCount: {
            type: Number,
            default: 0,
        },
        // 是否显示批量回收相关
        isShowButton: {
            type: Boolean,
            default: true,
        },
        //暂无数据文案的控制状态
        isShowDefaultTips: {
            type: Boolean,
            default: false,
        },
        searchData: {//搜索项数据
            type: Object,
            default: () => { return {} }
        }
    },
    data() {
        return {
            isSvgFullScreen: false,
            //水印img
            img: localStorage.getItem("waterMarkImg" + Cookies.get("uid")),

            //实例化局部元素全屏功能Class
            full: new fullScreen(() => {
                console.log("当前浏览器不支持全屏操作"); //如果运行环境不支持全屏,执行该回调函数
            }),
            //企业的uuid
            uuid: 'ca4ae967-3e0c-3d2b-b0be-bcb3fafe0e2b1',
            //绘制双向树所需数据
            //尺寸数据
            svgW: '',
            svgH: '',
            //点击操作时保留的ID
            updataId: '',
            //可展开节点数组
            hasChildNodeArr: [],
            //可展开已展开节点数组
            extendNodeId: [],

            //先这么命名 后续改掉
            //后续也不改

            i: 0, //动态生成唯一class 累加器

            //记录相同uuid公司出现的次数
            buffer: {},

            transitionTime: 300, // 过渡时间,会给收缩加上动画

            raduis: 9, // 加减符号半径

            COMPANY: 0,// 为以后区分人和公司做准备
            PERSON: 1,

            // 源头对象 宽度
            originDiamonds: {
                w: 240,
                h: 70
            },
            //常规节点的长宽,同时需要传给d3.tree生成器一组intervalWH,稍大一点,使生成器为数据展示预留空间
            diamonds: {
                w: 185,
                h: 110,
                //下面两项可以用来控制间距
                intervalW: 235,
                intervalH: 250
            },
            // 假如需要vip的话
            //   vip = true;

            //svg整体的边距处理
            margin: {
                top: 50,
                bottom: 0,
                left: 10,
                right: 0
            },
            // 接口接受的数据 
            treeData: '',
            //接口Url
            treeurl: 'https://www.gongsi.com.cn/detail/ca4ae967-3e0c-3d2b-b0be-bcb3fafe0e2b1/relationship-1',
            // 用于控制整体布局`间距坐标的结构化数据
            layoutTree: '',
            // 控制缩放
            zoom: '',
            //原始数据
            upTree: {},
            downTree: {},
            //结构化的数据
            rootUp: {},
            rootDown: {},
            treeArr: [],
            //企业状态字段
            reg_status_success: ['停业', '迁入', '清算', '在营', '撤销', '开业', '其他', '迁出', '在业', '存续', '正常', '存续（在营、开业、在册）', '在营（开业）企业', '存续(在营、开业、在册)'],
            reg_status_error: ['吊销,未注销', '注销企业', '吊销，已注销', '吊销', '吊销，未注销', '注销']
        }
    },
    watch: {

    },
    created() {
        this.full = new fullScreen(() => {
            console.log("当前浏览器不支持全屏操作"); //如果运行环境不支持全屏,执行该回调函数
        })

    },
    mounted() {
        this.svgW = document.body.clientWidth - 252 - 17
        this.svgH = 700
        //初始化双向树
        this.initTree()
    },
    methods: {

        /**
         * @description: 初始化绘制双向树的相关操作
         * @return {*}
         */
        initTree() {
            //进入全屏error后的回调函数,一般为用户(浏览器)不授予标签页全屏权限
            this.full.screenError(function (e) {
                console.log("fullScreenError:", e);
            }); // 全屏请求必须在事件处理函数中调用，否则将会被拒绝。
            this.full.screenChange(this.enter, this.quit);
            // 企业的uuid
            // this.buffer[uuid] = 1
            //先写死数据
            this.buffer[this.uuid] = 1
            // debugger

            d3.json('http://127.0.0.1:8083/data.json')
                .then(json => {
                    // debugger
                    json = json.data
                    this.treeData = json
                    this.treeData['backUuid'] = this.treeData.uuid
                    this.buffer[this.treeData.backUuid] = this.buffer[this.treeData.backUuid] == undefined ? this.buffer[this.treeData.backUuid] = 1 : this.buffer[this.treeData.backUuid] + 1
                    this.treeData.name = this.treeData.name
                    this.extendNodeId.push(this.treeData.uuid)
                    console.log('this.extendNodeId: ', this.extendNodeId);
                    this.draw()
                    //根据版本判断是否执行
                    // IEVersion() > 9 || IEVersion() <= -1 ? draw() : ''
                    // setWaterMark()
                    // if (IEVersion() > 10 || IEVersion() <= -1) {
                    //     let fullbutton = $("<li class='full-button' onclick='svgFullScreen()'>全屏</li>")
                    //     $(".chart-tools-buttons").append(fullbutton)
                    // }
                })

            //基本布局与间距因子
            this.layoutTree = d3.tree()
                .nodeSize([this.diamonds.intervalW, this.diamonds.intervalH])
                //相同父节点的子节点间距为1,不相同则为2 可引入depth参数控制不同层级内子节点相互间距递减/增
                .separation((a, b) => a.parent == b.parent ? 1 : 2);

            //缩放控制 数组内为缩放的最小和最大值
            this.zoom = d3.zoom().scaleExtent([0.1, 2])
        },

        /**
         * @description: 封装D3点击操作
         * @param {*} selection
         * @return {*}
         */
        d3Click(selection) {
            selection.attr("cursor", 'pointer')
                .on('click', function (d) {
                    if (d.depth === 0) {
                        return
                    }
                    // console.log("点击");
                    // 此处跳转操作
                    // window.open(config.domain + '/detail/' + d.data.backUuid)
                    window.open("https://www.google.com.hk/")

                })
                .on('mouseover', function (d) {
                    d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                    let rect = d3.select("rect[type =" + d.id + "]").attr("stroke", '#1f6cdd').attr('stroke-width', 2)
                    let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#1f6cdd').attr('stroke-width', 2)
                    // 将高亮的线放置到较高层级
                    item.raise()
                }
                )
                .on('mouseout', function (d) {
                    let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                    d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                    let rect = d3.select("rect[type =" + d.id + "]").attr("stroke", '#e4e4e4').attr('stroke-width', 1)
                    // 将解除高亮的线放置到较低层级
                    item.lower()
                }
                )
        },
        /**
         * @description: 绘制函数
         * @return {*}
         */
        draw() {
            let _this = this
            //当前点击的元素uuid(带计数器)值
            let clickUuid = ''
            //使用d3进行svg初始化
            let initsvg = d3.select("#toway-tree").append("svg").attr("id", "treesvg")
                .attr("width", this.svgW).attr("height", this.svgH)
                .attr('style', 'postition:relative;z-index : -1')
                .attr('xmlns', 'http://www.w3.org/2000/svg')
            let svg = initsvg.append('g').attr('class', 'main-tree')
                .attr('transform', 'translate(' + this.svgW / 2 + ',' + this.svgH / 2 + ')');//居中
            //调用缩放函数
            initsvg.call(this.zoom)
            this.zoom.on('zoom', () => {
                // 设置缩放位置以及平移初始位置
                svg.attr('transform', d3.event.transform.translate(this.svgW / 2, this.svgH / 2));
            })

            let glink = svg.append('g')

            //原始数据
            let upTree = {};
            let downTree = {};
            //结构化的数据
            let rootUp = {}
            let rootDown = {}
            let treeArr = []
            /**
             * 对原始数据进行备份和结构化处理  拷贝树的数据 一个去除 holderList  一个去除 investorList
             * @param {object} treeData
             */
            function preprocess(treeData) {
                Object.keys(treeData).map(function (item) {
                    if (item === 'holderList') {
                        // treeData[item].forEach(function(item))
                        // 向上展开的树
                        $.extend(true, upTree, treeData)//深拷贝
                        upTree['children'] = treeData[item];
                        upTree['parents'] = null;
                        upTree['children'].forEach((d) => {
                            d['backUuid'] = d.uuid
                            _this.buffer[d.backUuid] = _this.buffer[d.backUuid] == undefined ? _this.buffer[d.backUuid] = 1 : _this.buffer[d.backUuid] + 1
                            d.uuid = d.uuid + '-' + _this.buffer[d.backUuid]
                        })
                        // console.log(buffer);
                        // console.log("up", upTree);
                    } else if (item === 'investorList') {
                        $.extend(true, downTree, treeData)
                        downTree['children'] = treeData[item];
                        downTree['parents'] = null;
                        downTree['children'].forEach(function (d) {
                            d['backUuid'] = d.uuid
                            _this.buffer[d.backUuid] = _this.buffer[d.backUuid] == undefined ? _this.buffer[d.backUuid] = 1 : _this.buffer[d.backUuid] + 1
                            d.uuid = d.uuid + '-' + _this.buffer[d.backUuid]
                        })
                    }
                });

                //对于层次结构执行布局算法
                //这里引入的函数为默认,不添加也行,从根节点开始,返回一个数组表示当前数据的子节点,返回null 表示没有子节点
                rootUp = d3.hierarchy(upTree, function (d) {
                    return d.children;
                });
                rootUp.x0 = 0;
                rootUp.y0 = 0;
                rootDown = d3.hierarchy(downTree, function (d) {
                    return d.children;
                });
                rootDown.x0 = 0;
                rootDown.y0 = 0;

                //总架构
                treeArr = [{
                    data: rootUp,
                    type: 'up'
                }, {
                    data: rootDown,
                    type: 'down'
                }];
            }
            preprocess(this.treeData) //考虑到以后可能会复用

            treeArr.map(function (item) {
                //第一次执行更新树操作(从零开始绘制)
                update(item.data, item.type, item.data);
            });

            /**
              *数据更新用,主要是用来点击展开收起操作
              *  @param  {[Object]} source 第一次是初始源对象，后面是点击的对象
              *  @param  {[String]} showtype up表示向上 down表示向下
              *  @param  {[Object]} sourceTree 初始源对象
              */

            function update(source, showtype, sourceTree) {
                // 节点
                let nodes;
                // 线条
                let links;
                // let nodeLinks;
                if (showtype === 'up') {
                    //传入数据,并返回节点组的拓扑结构数组
                    nodes = _this.layoutTree(rootUp).descendants();
                    // nodeLinks = rootUp.links(); //可能后面维护会用
                } else {
                    //自身节点为首位,后代拓扑排序放后面 : descendants
                    nodes = _this.layoutTree(rootDown).descendants();
                }

                links = nodes.slice(1);
                nodes.forEach(function (d) {
                    //维持高度
                    d.y = d.depth * _this.diamonds.intervalH;
                });

                let node = svg.selectAll('g.node' + showtype).data(nodes, function (d) {
                    return d.id || (d.id = showtype + ++_this.i);
                });
                // 将退出节点转换到父节点的新位置.(为了动画效果)
                let nodeExit = node.exit()
                    .attr("fill-opacity", '1').attr("stroke-opacity", '1')
                    .transition().duration(function (d) {
                        if (d.parent != null && d.parent.data.uuid == _this.clickUuid) {
                            return _this.transitionTime
                        }
                    })
                    .attr('transform', function (d) {
                        return showtype === 'up' ? 'translate(' + (d.parent != null ? d.parent.x : source.x) + ',' + - (d.parent != null ? d.parent.y : source.y) + ')' : 'translate(' + (d.parent != null ? d.parent.x : source.x) + ',' + (d.parent != null ? d.parent.y : source.y) + ')'; // y值取负 单向变双向树 一棵树翻上去
                    })
                    .attr("fill-opacity", '0').attr("stroke-opacity", '0')
                    // .attr('transform', function () {
                    //   return showtype === 'up' ? 'translate(' + source.x0 + ',' + -source.y0 + ')' : 'translate(' + source.x0 + ',' + parseInt(source.y0) + ')';
                    // })
                    .remove();
                // nodeExit.select('rect').attr('width', diamonds.w).attr('height', diamonds.h).attr('stroke', 'skyblue').attr('stroke-width', 1);
                let nodeEnter = node.enter().append('g')
                    .attr("type", function (d) {
                        return d.id
                    })
                    .attr('uuid', function (d) {
                        return "uuid-" + d.data.uuid
                    })
                    .attr('transform', function (d) {
                        return showtype === 'up' ? 'translate(' + (d.parent != null ? d.parent.x : source.x) + ',' + - (d.parent != null ? d.parent.y : source.y) + ')' : 'translate(' + (d.parent != null ? d.parent.x : source.x) + ',' + (d.parent != null ? d.parent.y : source.y) + ')'; // y值取负 单向变双向树 一棵树翻上去
                    })
                    .attr('class', function (d) {
                        return showtype === "up" && !d.depth ? 'hide-node' : 'node' + showtype;
                    })
                    .attr('opacity', function (d) {
                        return showtype === 'up' && !d.depth ? rootDown.data.children.length ? 0 : 1 : 1;
                    })
                //动画效果
                nodeEnter
                    .attr("fill-opacity", '0').attr("stroke-opacity", '0')
                    .transition().duration(function (d) {
                        // console.log("ddddd", d, source);
                        if (d.data.uuid == _this.clickUuid) {
                            return _this.transitionTime - 300
                        } else if (d.parent != null && d.parent.data.uuid == _this.clickUuid) {
                            return _this.transitionTime
                        }
                    })
                    .attr('transform', function (d) {
                        return showtype === 'up' ? 'translate(' + d.x + ',' + -d.y + ')' : 'translate(' + d.x + ',' + d.y + ')'; // y值取负 单向变双向树 一棵树翻上去
                    })
                    .attr("fill-opacity", '1').attr("stroke-opacity", '1')


                // 创建矩形
                nodeEnter.append('rect')
                    .attr('type', function (d) { return d.id; })
                    .attr('width', function (d) {
                        return d.depth ? _this.diamonds.w : _this.originDiamonds.w;
                    }).attr('height', function (d) {
                        return d.depth ? (_this.diamonds.h - 10) : _this.originDiamonds.h;
                    }).attr('x', function (d) {
                        return d.depth ? (-_this.diamonds.w / 2) : (-_this.originDiamonds.w / 2);
                    }).attr('y', function (d) {
                        return d.depth ? showtype === 'up' ? (-_this.diamonds.h / 2) : (-_this.diamonds.h / 2) : '-50';
                    })
                    .attr('stroke', "#e4e4e4")
                    .attr('stroke-width', 1)
                    .attr('rx', 5)
                    .attr('ry', 5)
                    .style('fill', '#fff').style('fill', function (d) {
                        if (!d.depth) {
                            return d._children ? '#FFF' : d.depth ? '#fff' : '#1F6CDD';
                        } else {
                            return d._children ? '#fff' : d.depth ? '#fff' : '#FFF';
                        }
                    })
                    .call(_this.d3Click)


                //企业状态背景
                nodeEnter.append('rect').attr('type', function (d) {
                    return d.id + 'regstatus';
                }).attr('width', function (d) {
                    return d.depth ? _this.diamonds.w - 2 : 0;
                }).attr('height', function (d) {
                    return d.depth ? 16 : 0;
                })
                    .attr('x', function (d) {
                        return d.depth ? (-_this.diamonds.w / 2 + 1) : (-_this.originDiamonds.w / 2);
                    })
                    .attr('y', function (d) {
                        return d.depth ? showtype === 'up' ? (_this.diamonds.h / 2 - 27) : (_this.diamonds.h / 2 - 27) : '-15';
                    }).style('fill', function (d) {
                        return _this.reg_status_success.indexOf(d.data.reg_status) > -1 ? '#f0f8ff' : '#ffeee5'
                    })
                    .attr('visibility', function (d) {
                        return d.depth ? 'visible' : 'hidden'
                    })
                    .call(_this.d3Click)
                // 公司名称
                // y轴 否表源头的字体距离
                nodeEnter.append('text')
                    .attr('filter', function (d) { return d.depth < 2 ? " " : "url(#blur-effect)" })
                    .attr('x', 0)
                    .attr('y', function (d) {
                        // 如果是上半部分
                        if (showtype === 'up') {
                            // 如果是1层以上
                            if (d.depth) {
                                return -29; //  字号 / 2 ,文字水平基线没调
                            } else {
                                // 如果名字长度大于11个
                                return d.data.name.length > 11 ? 10 : 21;
                            }
                        } else {
                            if (d.depth) {
                                return -29;
                            } else {
                                return d.data.name.length > 11 ? -25 : -14;
                            }
                        }
                    })
                    //dy为相对位移
                    .attr('dy', function (d) {
                        return d.depth ? d.data.name.length > 11 ? '-11' : '0' : '0';
                    })
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', function (d) {
                        return d.depth ? 'black' : '#fff';
                    }).text(function (d) {
                        return d.data.name.length > 11 ? d.data.name.substr(0, 11) : d.data.name;
                    }).style('font-size', '14px').style('font-family', 'PingFangSC-Medium').style('font-weight', function (d) {
                        return d.depth ? 'normal' : 'bold';
                    })
                    .attr("cursor", "default")
                    .on('mouseover', function (d) {
                        d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        let parent = d3.select("rect[type =" + d.id + "]").attr("stroke", '#1f6cdd').attr('stroke-width', 2)
                        let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#1f6cdd').attr('stroke-width', 2)
                        item.raise()
                    }
                    )
                    .on('mouseout', function (d) {
                        let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        let parent = d3.select("rect[type =" + d.id + "]").attr("stroke", '#e4e4e4').attr('stroke-width', 1)
                        item.lower()
                    }
                    )

                // 名称过长 第二段
                nodeEnter.append('text').attr('x', 0)
                    .attr('y', function (d) {
                        if (showtype === 'up') {
                            return d.depth ? -29 : -14;
                        } else {
                            return d.depth ? -29 : -14;
                        }
                    })
                    //马赛克调用
                    // .attr('filter', function (d) { return d.depth < 2 ? " " : "url(#blur-effect)" })
                    .attr('dy', function (d) {
                        return d.depth ? '11' : '15';
                    })
                    .attr('text-anchor', 'middle')
                    // .attr('dominant-baseline','middle')
                    .attr('fill', function (d) {
                        return d.depth ? 'black' : '#fff';
                    })
                    .text(function (d) {
                        // 索引从第19个开始截取有表示超出
                        if (d.data.name.substr(19, 1)) {
                            return d.data.name.substr(11, 12) + '...';
                        }
                        return d.data.name.substr(11, 12);
                    })
                    .style('font-size', '14px')
                    .style('font-family', 'PingFangSC-Medium')
                    .style('font-weight', function (d) {
                        return d.depth ? 'normal' : 'bold';
                    })
                    .attr("cursor", "default")
                    .call(_this.d3Click)

                // 股权占比
                nodeEnter.append('text')
                    .attr("cursor", "default")
                    .attr('x', 7)
                    .attr('y', function (d) {
                        if (d.depth == 0) { d3.select(this).remove() }
                        // 如果是上半部分
                        if (showtype === 'up') {
                            return 80
                        } else {
                            return -75
                        }
                    })
                    .attr('text-anchor', 'start')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', '#1f6cdd')

                    .text(function (d) {
                        if (d.depth) {
                            return "" + d.data.percent
                        }
                    })
                    .attr('visibility', function (d) {

                        return d.depth ? 'visible' : 'hidden'
                    })
                    .style('font-size', '12px')
                    .style('font-family', 'PingFangSC-Regular')
                    .style('font-weight', '400')
                    .style('color', 'rgba(70,81,102,1)')
                // .call(d3Click)

                // 认缴金额
                nodeEnter.append('text')
                    .attr("cursor", "default")
                    .attr('x', 0)
                    .attr('y', function (d) {
                        if (d.depth == 0) { d3.select(this).remove() }
                        // 如果是上半部分
                        if (showtype === 'up') {
                            return -1
                        } else {
                            return -1
                        }
                    })
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', '#465166')
                    .text(function (d) {
                        if (d.depth) {
                            if (d.data.subscription.length > 15) {
                                if (d.data.subscription.length < 20) {
                                    return "认缴金额:" + d.data.subscription.substr(0, d.data.subscription.length - 4) + '...';
                                } else {
                                    return "认缴金额:" + d.data.subscription.substr(0, 18) + '...';
                                }
                            } else {
                                return "认缴金额:" + d.data.subscription
                            }
                        }
                    })
                    .attr('visibility', function (d) {
                        return d.depth ? 'visible' : 'hidden'
                    })
                    .style('font-size', '12px')
                    .style('font-family', 'PingFangSC-Regular')
                    .style('font-weight', '400')
                    .style('color', 'rgba(70,81,102,1)')
                    .call(_this.d3Click)

                // 注册资本
                nodeEnter.append('text')
                    .attr("cursor", "default")
                    .attr('x', 0)
                    .attr('y', function (d) {
                        if (d.depth == 0) {
                            d3.select(this).remove()
                        }
                        // 如果是上半部分
                        if (showtype === 'up') {
                            return 16
                        } else {
                            return 16
                        }
                    })
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', '#465166')
                    .text(function (d) {
                        if (d.depth) {
                            if (d.data.reg_capital.length > 15) {
                                if (d.data.reg_capital.length < 20) {
                                    return "注册资本:" + d.data.reg_capital.substr(0, d.data.reg_capital.length - 3) + '...';
                                } else {
                                    return "注册资本:" + d.data.reg_capital.substr(0, 18) + '...';
                                }
                            } else {
                                return "注册资本:" + d.data.reg_capital
                            }
                        }
                    })
                    .attr('visibility', function (d) {
                        return d.depth ? 'visible' : 'hidden'
                    })
                    .style('font-size', '12px')
                    .style('font-family', 'PingFangSC-Regular')
                    .style('font-weight', '400')
                    .style('color', 'rgba(70,81,102,1)')
                    .call(_this.d3Click)

                //reg_status 企业状态
                nodeEnter.append('text')
                    .attr("cursor", "default")
                    .attr('x', 0)
                    .attr('y', function (d) {
                        return showtype === 'up' ? (_this.diamonds.h / 2 - 27 + 12) : (_this.diamonds.h / 2 - 27 + 12);
                    })
                    .attr('text-anchor', 'middle')
                    .attr('fill', function (d) {
                        return _this.reg_status_success.indexOf(d.data.reg_status) > -1 ? '#1f6cdd' : '#ff7262'
                    })
                    .text(function (d) {
                        return d.depth ? d.data.reg_status : ''
                    })
                    .style('font-size', '12px')
                    .style('font-family', 'PingFangSC-Regular')
                    .style('font-weight', '400')
                    .style('color', 'rgba(70,81,102,1)')
                    .call(_this.d3Click)
                // 创建圆 加减符号
                let clickNode = nodeEnter.append('g')
                    .on('click', function (d) {
                        _this.clickUuid = d.data.uuid
                        if (_this.extendNodeId.indexOf(d.data.uuid) > -1) {
                            // debugger

                            click(d, showtype, sourceTree);
                            // debugger
                            // console.log("<______________________________点击事件DOM updata == 要收起 收起操作执行________________________________>");
                            _this.extendNodeId = _this.extendNodeId.filter(function (item) {
                                if (item != d.data.uuid) {
                                    return item
                                }
                            })
                            // console.log(extendNodeId);
                            d3.select("line.vertical-line[type =" + d.id + "]").attr('visibility', 'visible');

                        } else {
                            // updataId = d.data.uuid + '-'  + d.depth
                            click(d, showtype, sourceTree, _this.updataId);
                            // console.log("<______________________________点击事件DOM_ updata ==  要展开 展开操作执行_______________________________>");
                            d3.select("line.vertical-line[type =" + d.id + "]").attr('visibility', 'hidden');
                        }
                    });

                clickNode.append('circle').attr('type', function (d) {
                    return d.id || (d.id = showtype + 'text' + ++i);
                }).attr('r', function (d) {
                    return d.depth ? (d.data.isinvest == 0 || d.data.isholder == 0) ? 0 : _this.raduis : 0;
                })
                    .attr('cy', function (d) {
                        return d.depth ? showtype === 'up' ? -(_this.raduis + _this.diamonds.h / 2) : + _this.diamonds.h / 2 : 0;
                    })
                    //定位圆点
                    .attr('cx', 0).attr("fill", "#fff").attr("storke-width", 2).attr('stroke', "#1F6CDD").attr("cursor", "pointer");

                // 代表是否展开的+-号,function this指向当前dom
                clickNode.append('svg:line')
                    .attr('visibility', function (d) {
                        return d.depth ? (d.data.isinvest == 0 || d.data.isholder == 0) ? "hidden" : 'visible' : "hidden";
                    }
                    )
                    .attr('visibility', function (d) {
                        if (d.depth == 0) { d3.select(this).remove() }

                        if (d.isOpen == 1 || _this.hasChildNodeArr.indexOf(d) === -1) { return 'hidden'; }
                        //这块的逻辑判断有点乱,先别动,bug算是修了
                    })
                    .attr("class", 'vertical-line')
                    .attr('visibility', function (d) {
                        return _this.extendNodeId.indexOf(d.data.uuid) === -1 ? (d.data.isinvest == 0 || d.data.isholder == 0) ? "hidden" : 'visible' : 'hidden';
                    })
                    .attr("stroke", function (d) { return d.depth ? '#128BED' : "#1f6cdd" })

                    .attr('stroke-width', '2').attr('x1', '0').attr('y1', function (d) {
                        return (d.depth ? showtype === 'up' ? -(_this.raduis + _this.diamonds.h / 2) : + _this.diamonds.h / 2 : 0) - 5;
                    })
                    .attr('x2', '0').attr('y2', function (d) {
                        return (d.depth ? showtype === 'up' ? -(_this.raduis + _this.diamonds.h / 2) : + _this.diamonds.h / 2 : 0) + 5;
                    })
                    .attr('type', function (d) {
                        return d.id || (d.id = showtype + 'text' + ++_this.i);
                    })
                    .attr("cursor", "pointer")

                clickNode.append('svg:line')
                    .attr('visibility', function (d) {
                        if (d.depth == 0) { d3.select(this).remove() }
                        return d.depth ? (d.data.isinvest == 0 || d.data.isholder == 0) ? "hidden" : 'visible' : "hidden";
                    })
                    .attr("class", 'horizontal-line').attr("stroke", '#128BED').attr('stroke-width', '2').attr('y1', function (d) {
                        return d.depth ? showtype === 'up' ? -(_this.raduis + _this.diamonds.h / 2) : + _this.diamonds.h / 2 : 0;
                    })
                    .attr('x1', '-5').attr('y2', function (d) {
                        return d.depth ? showtype === 'up' ? -(_this.raduis + _this.diamonds.h / 2) : + _this.diamonds.h / 2 : 0;
                    })
                    .attr('x2', '5').attr('type', function (d) {
                        return d.id || (d.id = showtype + 'text' + ++_this.i);
                    })
                    .attr("cursor", "pointer")

                /*
                 * 绘制箭头
                 * @param  {string} markerUnits [设置为strokeWidth箭头会随着线的粗细发生变化]
                 * @param {string} viewBox 坐标系的区域
                 * @param {number} markerWidth,markerHeight 标识的大小
                 * @param {string} orient 绘制方向，可设定为：auto（自动确认方向）和 角度值
                 * @param {number} stroke-width 箭头宽度
                 * @param {string} d 箭头的路径
                 * @param {string} fill 箭头颜色
                 *
                 */

                nodeEnter.append('marker')
                    .attr('id', showtype + 'resolved')
                    .attr('markerUnits', 'strokeWidth')
                    .attr('markerUnits', 'userSpaceOnUse')
                    .attr('viewBox', '0 -5 10 10')
                    .attr('markerWidth', 12)
                    .attr('markerHeight', 12)
                    .attr('orient', '90')
                    .attr('refX', function () {
                        return showtype === 'up' ? '-60' : '70';
                    })
                    .attr('stroke', 'none') // 防止箭头继承路径的属性 iebug
                    .append('path').attr('d', 'M2,0L0,-4L12,0L0,4').attr('fill', '#1f6cdd').attr('fill-opacity', 1);

                // 高斯模糊
                nodeEnter.append('filter')
                    .attr('id', "blur-effect")
                    .append('feGaussianBlur')
                    .attr('in', "SourceGraphic")
                    .attr('stdDeviation', '0') // 模糊等级

                //移动节点位置
                let nodeUpdate = node.transition().duration(function (d) {
                    if (d.data.children != null && d.data.children.length > 10) {
                        return 500
                    } else {
                        return 100
                    }
                })
                    .attr('transform', function (d) {
                        // console.log('移动节点');
                        return showtype === 'up' ? 'translate(' + d.x + ',' + -d.y + ')' : 'translate(' + d.x + ',' + d.y + ')';
                    });



                let link = glink.selectAll('path.link' + showtype).data(links, function (d) {
                    return d.id;
                })

                // 在父级前的位置画线和箭头
                let linkEnter = link.enter().insert('path', 'g')
                    .attr('type', function (d) {
                        return d.id || (d.id = showtype + 'text' + ++_this.i)
                    })
                    .attr('id', function () {
                        return 'linkpath'
                    })
                    .attr('cursor', 'pointer')
                    .attr('class', 'link' + showtype)
                    .attr('marker-start', function (d) {
                        if (showtype == "down") {
                            return "url(#".concat(showtype, "resolved").concat(")");
                        }
                    })
                    .attr('marker-end', function (d) {
                        if (showtype == "up") {
                            return "url(#".concat(showtype, "resolved").concat(")");
                        }
                    })
                    // 根据箭头标记的id号标记箭头
                    .attr('stroke', '#e4e4e4')
                    .attr('d', function (d) {
                        let o = {
                            x: source.x0,
                            y: source.y0
                        };
                        return diagonal(o, o, showtype) + '';
                    })
                    //先移除path on path的高亮显示,因为快速移动的指针可能不会依次调用两个互斥的事件
                    .on('mouseover', function (d) {
                        d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        // let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#1f6cdd').attr('stroke-width', 2)
                        // item.raise()
                    }
                    ).on('mouseout', function (d) {
                        d3.selectAll("path[id =linkpath]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        let item = d3.select("path[type =" + d.id + "]").attr('stroke', '#d9d9d9').attr('stroke-width', 1)
                        // item.lower()
                    }
                    );

                let linkUpdate = linkEnter.merge(link);
                //绘制线条
                linkUpdate.transition().duration(0).attr('d', function (d) {
                    return diagonal(d.parent, d, showtype);
                });

                link.exit().transition().duration(0).attr('d', function (d) {
                    let o = {
                        x: source.x0,
                        y: source.y0
                    };
                    return diagonal(o, o, showtype);
                }).remove();

                nodes.forEach(function (d) {
                    d.x0 = d.x;
                    d.y0 = d.y;
                    if (_this.clickUuid == d.data.uuid) {
                        //以下代码为点击后移动树到指定位置(被点击元素居中),但是存在延迟问题和缩放闪现 已经解决
                        let axis = d3.select("g[uuid =uuid-" + d.data.uuid + "]").attr('transform').replace(/(.*\()(.*)(\).*)/, '$2').split(',')
                        // console.log(d.data.name, axis);
                        // d3.select(".main-tree").attr("transform","translate(" + (svgW/2 - (axis[0]- 0)) + "," + (svgH/2 - (axis[1] - 0)) + ")")
                        d3.select('#treesvg').transition()
                            .duration(800)
                            .call(_this.zoom.transform, d3.zoomIdentity.translate(-d.x0, showtype == 'up' ? d.y0 : -d.y0))
                        // console.log((svgW / 2 - (axis[0] - 0)), (svgH / 2 - (axis[1] - 0)));
                        // console.log(d3.select(".main-tree").attr("transform"));
                    }

                });
            }


            /**
            * 隐藏层级>1以上的子节点,先用_children 做备份
            * 该函数暂时未被使用
            * @param {[String]} source 传入一个子节点
            */
            function collapse1(source) {
                // console.log(source);
                if ((source.isholder != 0 || source.isinvest != 0) && extendNodeId.indexOf(source.data.uuid) <= -1) {
                    source._children = source.children;
                    source.children = null;
                    hasChildNodeArr.push(source);
                } else if ((source.isholder != 0 || source.isinvest != 0) && extendNodeId.indexOf(source.data.uuid) > -1) {
                    source.children = source.children;
                    source._children = null
                    hasChildNodeArr.push(source);
                }
            }


            /**
             * 路径坐标生成器
             * 结构 M,L,L,L,....
             * https://developer.mozilla.org/zh-CN/docs/Web/SVG/Tutorial/Paths
             * @param {*} source 起始节点
             * @param {*} target 目标节点
             * @param {*} showtype up or down
             * @returns 路径绘制参数
             */
            function diagonal(source, target, showtype) {
                if (showtype === 'up') {
                    let _drawLine = d3.line();

                    let start = [source.x, -source.y];
                    let end = [target.x, -target.y];
                    let brokenLineStart = [start[0], -(-end[1] - start[1]) / 2];
                    let brokenLineEnd = [end[0], -(-end[1] - start[1]) / 2];
                    let points = [start, brokenLineStart, brokenLineEnd, end];
                    return _drawLine(points);
                } else {
                    let _drawLine2 = d3.line();

                    let _end = [source.x, source.y];
                    let _start = [target.x, target.y];
                    let _brokenLineStart = [_start[0], (_end[1] + _start[1]) / 2];
                    let _brokenLineEnd = [_end[0], (_end[1] + _start[1]) / 2];
                    let _points = [_start, _brokenLineStart, _brokenLineEnd, _end];
                    return _drawLine2(_points);
                }
            }

            /**
             * 更新绘制数据
             * @param {*} treeData
             * @param {*} newChildren 新节点
             * @param {*} uuid 赋予新节点时的唯一标识
             */
            function addPreprocess(treeData, newChildren, uuid) {

                //对于层次结构执行布局算法
                //这里引入的函数为默认,不添加也行,从根节点开始,返回一个数组表示当前数据的子节点,返回null 表示没有子节点
                rootUp = d3.hierarchy(upTree, function (d) {

                    if (d.uuid == newChildren.uuid) {
                        // console.log("测试重复数据解决",d.id,newChildren.id);
                        if (_this.extendNodeId.indexOf(d.uuid) <= -1) {
                            _this.extendNodeId.push(d.uuid)
                            // debugger
                            d.children = newChildren.children
                            _this.hasChildNodeArr.push(d.uuid)
                            return newChildren.children
                        }
                    }
                    else if (d.uuid == uuid) {
                        d._children = d.children
                        return d.children
                    }
                    else if (_this.extendNodeId.indexOf(d.uuid) > -1) {
                        return d.children
                    }
                });
                rootUp.x0 = 0;
                rootUp.y0 = 0;
                rootDown = d3.hierarchy(downTree, function (d) {
                    if (d.uuid == newChildren.uuid) {
                        // console.log("测试重复数据解决",d.id,newChildren.id);
                        if (_this.extendNodeId.indexOf(d.uuid) <= -1) {
                            _this.extendNodeId.push(d.uuid)
                            // debugger
                            d.children = newChildren.children
                            _this.hasChildNodeArr.push(d.uuid)
                            return newChildren.children
                        }
                    }
                    else if (d.uuid == uuid) {
                        d._children = d.children
                        return d.children
                    }
                    else if (_this.extendNodeId.indexOf(d.uuid) > -1) {
                        return d.children
                    }
                });

                rootDown.x0 = 0;
                rootDown.y0 = 0;
                treeArr = [{
                    data: rootUp,
                    type: 'up'
                }, {
                    data: rootDown,
                    type: 'down'
                }];
                treeArr.map(function (item) {
                    update(item.data, item.type, item.data);
                });
            }
            /**
             * 点击操作,有子数据就展开,没有就去获取数据
             * @param {*} source 被点击节点的数据
             * @param {*} showType 类型
             * @param {*} sourceTree 源
             */
            function click(source, showType, sourceTree) {
                // console.log("点击给的source", source);
                if (source.depth) {
                    if (source.children) {
                        // && extendNodeId.indexOf(source.uuid) <= -1
                        source._children = source.children;
                        source.children = null;
                        // source.isOpen = 1
                        // console.log("有子节点 直接收起_____________________________________________________________");
                        // console.log("收起source", source);

                    } else if (source._children) {
                        source.children = source._children;
                        source._children = null;
                        // source.isOpen = -1
                        // console.log("有备份节点 __________________________________________________________________s");
                        // console.log("展开source", source);
                        _this.extendNodeId.push(source.data.uuid)
                    } else {
                        let url
                        let relationship = source.isholder ? '/relationship-3' : '/relationship-2'
                        if ("root-" + _this.uuid == source.data.uuid) {

                            url = 'http://127.0.0.1:8083/data-up.json'
                            // url = config.domain + '/detail/' + uuid + relationship

                        } else {

                            url = 'http://127.0.0.1:8083/data-up.json'

                            // url = config.domain + '/detail/' + source.data.backUuid + relationship

                        }
                        // console.log('url', url);
                        d3.json(url).then(function (json) {
                            // console.log("json", json);
                            json = json.data
                            // console.log(hasChildNodeArr);
                            let newChildren = json
                            json['backuuid'] = json.uuid
                            // debugger
                            json.uuid = source.data.uuid
                            let moreChildren = json.children
                            // console.log(moreChildren);
                            //  json.uuid = json.uuid + '-'+ buffer[json.uuid]
                            moreChildren.forEach(function (d) {
                                d.backUuid = d.uuid
                                _this.buffer[d.backUuid] = _this.buffer[d.backUuid] == undefined ? _this.buffer[d.backUuid] = 1 : _this.buffer[d.backUuid] + 1
                                d.uuid = d.uuid + '-' + _this.buffer[d.backUuid]
                                // console.log("buffer", buffer);
                            })
                            addPreprocess(_this.treeData, newChildren, json.uuid)
                        })
                    }
                    update(source, showType, sourceTree);
                    // source._children = source.children;
                    // source.children = null;
                }
            }

        },
        /**
         * @description: 重置,重新获取数据进行绘制
         * @return {*}
         */
        resetSvg() {
            d3.select('#treesvg').remove();
            // console.log("chonghui");
            this.svgW = 894;
            this.svgH = 700;
            this.hasChildNodeArr = [];
            this.extendNodeId = [];
            this.treeData = _treeData
            this.draw()
            setWaterMark()
        },
        /**
         * @description: 重置双向树的缩放移动状态
         * @return {*}
         */
        refreshZoom() {
            d3.select('#treesvg').transition()
                .duration(750)
                .call(this.zoom.transform, d3.zoomIdentity);
        },
        /**
         * @description: 双向树全屏
         * @param {*} e
         * @return {*}
         */
        enter(e) {
            console.log("TREE 全屏");
        },
        /**
         * @description: 退出全屏 此处参数需要调整
         * @param {*} e
         * @return {*}
         */
        quit: function quit(e) {
            if (document.fullscreenElement) {
                setTimeout(function () { this.full.exitFullscreen('#toway-tree') }, 1);
            }  //延迟调用防止报错 chrome浏览器bug
            this.delWaterMark()
            this.isSvgFullScreen = false

            this.svgW = document.body.clientWidth - 252 - 17
            this.svgH = 700
            // full.exitFullscreen('#toway-tree');
            let toway = document.getElementById('toway-tree')
            toway.setAttribute('height', this.svgH + '')

            let svg = document.getElementById('treesvg')
            svg.setAttribute('width', this.svgW + '')
            svg.setAttribute('height', this.svgH + '')

            d3.select('.main-tree').attr('transform', 'translate(' + this.svgW / 2 + ',' + this.svgH / 2 + ')');

            // svg.setAttribute('height',window.screen.height)
            d3.select('#treesvg').transition()
                // .duration(750)
                .call(this.zoom.transform, d3.zoomIdentity);
            //console.log("离开");
            //console.log("退出全屏", e); // 通常不会出现嵌套的情况

        },
        /**
         * @description: 股权穿透图的Svg全屏处理
         * @return {*}
         */
        svgFullScreen() {
            this.full.Fullscreen("#toway-tree");
            let svg = document.getElementById('treesvg')
            svg.setAttribute('width', document.body.clientWidth)
            svg.setAttribute('height', window.screen.height)
            this.svgW = document.body.clientWidth
            this.svgH = window.screen.height
            d3.select('#treesvg').transition()
                // .duration(750)
                .call(this.zoom.transform, d3.zoomIdentity);
            //console.log("我执行了__________________________________________________________");
            this.setWaterMark()
            d3.select('.main-tree').attr('transform', 'translate(' + document.body.clientWidth / 2 + ',' + window.screen.height / 2 + ')');

        },

        /**
         * @description: 退出全屏
         * @return {*}
         */
        exitScreen() {
            // debugger
            //延迟调用解决一下报错
            // fullscreen.js:58 Uncaught (in promise) TypeError: Failed to execute 'exitFullscreen' on 'Document': Document not active
            if (document.fullscreenElement) {
                setTimeout(function () { this.full.exitFullscreen('#toway-tree') }, 400);
            }
            this.full.exitFullscreen('#toway-tree')
            let toway = document.getElementById('toway-tree')
            toway.setAttribute('height', '700')
            // d3.select('#treesvg g').attr('transform', 'translate(' + 894 / 2 + ',' + 600 / 2 + ')');
        },

        /**
         * @description: 为全屏下的svg添加单独的水印,因为局部元素全屏下全局水印会失效
         * @return {*}
         */
        setWaterMark() {// 水印组件

            let base64Img = this.img; // console.log(can.toDataURL('image/png'));

            let mark = document.getElementById('treesvg'); // console.log(mark);
            // console.log(base64Img);

            mark.style.backgroundImage = "url(" + base64Img + ")";
        },
        /**
         * @description: 退出全屏后清除svg水印
         * @return {*}
         */
        delWaterMark() {
            let mark = document.getElementById('treesvg'); // console.log(mark);
            // console.log(base64Img);

            mark.style.backgroundImage = "none";
        }


    }
}
</script>

<style lang="less">
@import './list.less';
</style>